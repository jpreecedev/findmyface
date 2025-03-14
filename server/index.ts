require("dotenv").config()

import express from "express"
import next from "next"
import cors from "cors"
import cookieParser from "cookie-parser"
import passport from "passport"
import { Handlers, init } from "@sentry/node"
import compression from "compression"

import router from "./router"
import { connectToDatabase } from "./database/connection"
import { initialiseAuthentication, utils } from "./auth"
import { ROLES } from "../utils/roles"
import { log } from "./utils"

const port = parseInt(process.env.PORT || "", 10) || 3000
const dev = process.env.NODE_ENV !== "production"
const nextApp = next({ dev })
const handle = nextApp.getRequestHandler()

nextApp.prepare().then(() => {
  const app = express()
  app.use(compression())

  if (!dev) {
    init({ dsn: "https://bd58a1b715494744b2bc3b9c444172d1@sentry.io/1727049" })
  }

  app.use(Handlers.requestHandler())
  app.use(cors())
  app.use(cookieParser())

  app.use(passport.initialize())

  router(app)
  initialiseAuthentication(app)

  app.get(
    "/dashboard",
    passport.authenticate("jwt", { failureRedirect: "/login" }),
    utils.checkIsInRole(ROLES.Admin, ROLES.Photographer),
    (req, res) => {
      return handle(req, res)
    }
  )

  app.get(
    "/upload",
    passport.authenticate("jwt", { failureRedirect: "/login" }),
    utils.checkIsInRole(ROLES.Admin, ROLES.Photographer),
    (req, res) => {
      return handle(req, res)
    }
  )

  app.get("*", (req, res) => {
    return handle(req, res)
  })
  ;(async () => {
    await connectToDatabase()
  })()

  app.use(Handlers.errorHandler())

  app.listen(port, err => {
    if (err) throw err
    log(`> Ready on ${process.env.SERVER_URL}`)
    log(`${process.env.NODE_ENV}`)
  })
})
