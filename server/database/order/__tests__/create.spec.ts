import { Types } from "mongoose"
import { createOrder } from "../create"
import TestDbHelper from "../../../../setup/mongo"
import { Order } from "../../../../global"

const dbHelper = TestDbHelper()

describe("Create order tests", () => {
  beforeAll(async () => {
    await dbHelper.start()
  })

  afterAll(async () => {
    await dbHelper.stop()
  })

  afterEach(async () => {
    await dbHelper.cleanup()
  })

  test("should create an order", async () => {
    const order = <Order>{
      moments: [Types.ObjectId("1aaa9190969b198adaa1ba91")],
      customerId: "TEST_CUSTOMER_ID_123",
      sessionId: "TEST_SESSION_ID",
      stripeOrderId: "TEST_STRIPE_ORDER_ID",
      fulfilled: true
    }

    const newOrder = await createOrder(order)

    expect(newOrder).toBeDefined()
    expect(newOrder._id).not.toBeUndefined()
    expect(newOrder.moments.length).toEqual(1)
    expect(newOrder.customerId).toEqual(order.customerId)
    expect(newOrder.sessionId).toEqual(order.sessionId)
    expect(newOrder.stripeOrderId).toEqual(order.stripeOrderId)
    expect(newOrder.fulfilled).toEqual(order.fulfilled)
  })
})
