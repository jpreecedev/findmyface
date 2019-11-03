import { Response, Request } from "express"
import uuid from "uuid/v4"

import { getAllUsers, updateRole } from "../database/user"
import { errorHandler } from "../utils"
import { utils } from "../auth"
import { ClientResponse, DatabaseUser, UpdateRoleRequest, StripeCsrfToken } from "../../global"
import { createCsrfToken } from "../database/stripecsrftoken"

async function get(req: Request, res: Response) {
  try {
    const users = await getAllUsers()

    return res.status(200).json(<ClientResponse<DatabaseUser[]>>{
      success: true,
      data: users
    })
  } catch (e) {
    errorHandler.handle(e)
    return res.status(500).json(<ClientResponse<string>>{
      success: false,
      data: e
    })
  }
}

async function getRegisterPhotographer(req: Request, res: Response) {
  const state = uuid()
  await createCsrfToken(<StripeCsrfToken>{ state })

  return res.redirect(process.env.STRIPE_EXPRESS_REGISTER_URL.replace("{STATE_VALUE}", state))
}

async function getRole(req: Request, res: Response) {
  try {
    const role = await utils.getUserRole(req)

    return res.status(200).json(<ClientResponse<string>>{
      success: true,
      data: role
    })
  } catch (e) {
    return res.status(500).json(<ClientResponse<string>>{
      success: false,
      data: e
    })
  }
}

async function post(req: UpdateRoleRequest, res: Response) {
  try {
    const { id, role } = req.body

    const result = await updateRole(id, role)
    if (result === true) {
      return res.status(200).json(<ClientResponse<DatabaseUser[]>>{
        success: true,
        data: null
      })
    }

    return res.status(404).json(<ClientResponse<string>>{
      success: false,
      data: result
    })
  } catch (e) {
    errorHandler.handle(e)
    return res.status(500).json(<ClientResponse<string>>{
      success: false,
      data: e
    })
  }
}

export default { get, getRole, getRegisterPhotographer, post }
