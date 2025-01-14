import { Types } from "mongoose"
import fetch from "isomorphic-unfetch"
import uuid from "uuid/v4"
import { Response, Request } from "express"
import { to } from "await-to-js"
import Stripe from "stripe"

import { createCsrfToken } from "../database/stripecsrftoken"
import {
  StripeCsrfToken,
  StripeExpressConnect,
  UserRequest,
  PictureItem,
  Order,
  ClientResponse,
  Email
} from "../../global"
import { errorHandler } from "../utils"
import { sendEmail } from "../utils/email"
import { updateStripeData } from "../database/user/update"
import { getRedirectUrl } from "../auth/utils"
import { getMoments } from "../database/moments"
import { getCollection } from "../database/collection"
import { createOrder, getOrderByPaymentIntentId } from "../database/order"
import { fulfillOrder } from "../database/order/update"
import { getUserById } from "../database/user"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "")

const wait = ms => new Promise(r => setTimeout(r, ms))

const retryOperation = (operation, delay, times): Promise<Order> =>
  new Promise((resolve, reject) => {
    return operation()
      .then(resolve)
      .catch(reason => {
        if (times - 1 > 0) {
          return wait(delay)
            .then(retryOperation.bind(null, operation, delay, times - 1))
            .then(resolve)
            .catch(reject)
        }
        return reject(reason)
      })
  })

async function sendConfirmationEmail({ email, orderId }) {
  const confirmationEmail = <Email>{
    to: email,
    from: "no-reply@photonow.io",
    subject: `PhotoNow.io Order confirmation`,
    message: `<p>Hello, thank you for your order!</p>
<p>You can review your order and download your pictures any time by clicking this link; <a href="${process.env.SERVER_URL}order-confirmation/${orderId}">${process.env.SERVER_URL}order-confirmation/${orderId}</a></p>
<p>Thank you for your order.</p>
<p>The team at PhotoNow.io</p>`
  }

  return await sendEmail(confirmationEmail)
}

async function checkOrderStatus(req: Request, res: Response) {
  const { paymentIntentId } = req.body

  const getOrder = async () => {
    return new Promise((resolve, reject) => {
      getOrderByPaymentIntentId(paymentIntentId).then(order => {
        if (order.fulfilled || process.env.NODE_ENV === "development") {
          return resolve(order)
        }
        return reject("Order is not fulfilled")
      })
    })
  }

  try {
    const order = await retryOperation(getOrder, 1000, 30)

    return res.status(200).json(<ClientResponse<string>>{
      success: true,
      data: `/order-confirmation/${order._id}`
    })
  } catch (err) {
    return res.status(500).json(<ClientResponse<string>>{
      success: false,
      data: err
    })
  }
}

async function paymentIntentCompleted(intent: Stripe.paymentIntents.IPaymentIntent) {
  const order = await fulfillOrder(intent.id)

  if (intent.receipt_email) {
    await sendConfirmationEmail({
      email: intent.receipt_email,
      orderId: order._id
    })
  }
}

async function paymentIntent(req: Request, res: Response) {
  try {
    const { pictures }: { pictures: PictureItem[] } = req.body
    const moments = await getMoments(pictures.map(picture => Types.ObjectId(picture.momentId)))
    const collection = await getCollection(moments[0].collectionId)
    const photographer = await getUserById(moments[0].photographerId)

    const amount = pictures.filter(picture => picture.addedToBasket).length * collection.price

    let intentData: any = {
      amount,
      currency: "gbp"
    }

    if (process.env.NODE_ENV !== "development") {
      intentData = {
        ...intentData,
        application_fee_amount: amount <= 500 ? 50 : Math.floor(amount / 10),
        transfer_data: {
          destination: photographer.stripeData.userId
        }
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(intentData)

    await createOrder(<Order>{
      moments: moments.map(moment => moment._id.toString()),
      paymentIntentId: paymentIntent.id,
      fulfilled: false
    })

    return res.status(200).json(<ClientResponse<string>>{
      success: true,
      data: paymentIntent.client_secret
    })
  } catch (err) {
    errorHandler.handle(err)
    return res.status(500).json(<ClientResponse<string>>{
      success: false,
      data: err
    })
  }
}

async function start(req: Request, res: Response) {
  const state = uuid()
  await createCsrfToken(<StripeCsrfToken>{ state })

  return res.redirect(process.env.STRIPE_EXPRESS_REGISTER_URL.replace("{STATE_VALUE}", state))
}

async function requestAccess(req: UserRequest, res: Response) {
  const code = req.query.code
  const body = {
    client_secret: process.env.STRIPE_SECRET_KEY,
    grant_type: "authorization_code",
    code
  }

  const [err, response] = await to(
    fetch(process.env.STRIPE_EXPRESS_CREATE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
      body: Object.entries(body)
        .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
        .join("&")
    }).then(res => res.json())
  )

  if (err) {
    errorHandler.handle(err)
    return res.status(500).send("We were unable to complete the registration process")
  }

  const {
    access_token,
    refresh_token,
    token_type,
    stripe_publishable_key,
    stripe_user_id,
    scope
  } = response

  const stripeData: StripeExpressConnect = {
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenType: token_type,
    publishableKey: stripe_publishable_key,
    userId: stripe_user_id,
    scope
  }

  const updatedUser = await updateStripeData(req.user._id, stripeData)

  return res.redirect(getRedirectUrl(updatedUser))
}

export default {
  start,
  requestAccess,
  paymentIntent,
  paymentIntentCompleted,
  checkOrderStatus
}
