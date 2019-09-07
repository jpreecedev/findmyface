import React, { FunctionComponent } from "react"
import { Field, reduxForm } from "redux-form"
import Link from "next/link"
import { makeStyles } from "@material-ui/core/styles"
import Button from "@material-ui/core/Button"
import Grid from "@material-ui/core/Grid"

import { renderTextField } from "../FormTextField"
import { FacebookLoginButton } from "../FacebookLoginButton"

const useStyles = makeStyles(theme => ({
  submit: {
    margin: theme.spacing(3, 0, 2)
  }
}))

interface LoginProps {}

const LoginForm: FunctionComponent<LoginProps> = () => {
  const classes = useStyles({})

  return (
    <>
      <Field
        variant="outlined"
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        autoFocus
        component={renderTextField}
      />
      <Field
        variant="outlined"
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
        component={renderTextField}
      />
      <Button
        type="submit"
        fullWidth
        variant="outlined"
        color="primary"
        className={classes.submit}
      >
        Sign In
      </Button>
      <FacebookLoginButton />

      <Grid container justify="flex-end">
        <Grid item>
          <Link href="/register">
            <a>Don't already have an account?</a>
          </Link>
        </Grid>
      </Grid>
    </>
  )
}

const ReduxLoginForm = reduxForm({
  form: "loginForm"
})(LoginForm)

export { ReduxLoginForm as LoginForm }