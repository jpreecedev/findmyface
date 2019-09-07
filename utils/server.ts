function getServerApiUrl() {
  return process.env.SERVER_API_URL
}

async function callFetchAsync(
  url: string,
  method: "GET" | "PUT" | "POST" | "DELETE",
  body: object = {},
  headers = {}
) {
  try {
    const options = {
      headers: new Headers({
        "Content-Type": "application/json",
        ...headers
      }),
      body: ""
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${getServerApiUrl()}${url}`, {
      method,
      credentials: "same-origin",
      ...options
    })

    if (response.status !== 200) {
      throw new Error(
        `Request failed with status code ${response.status}.  ${await response.text()}`
      )
    }

    return await response.json()
  } catch (err) {
    console.error(err)

    return undefined
  }
}

function getAsync(url: string) {
  return callFetchAsync(url, "GET", null, null)
}

function postAsync(url: string, body: any) {
  return callFetchAsync(url, "POST", body, null)
}

function putAsync(url: string, body: any) {
  return callFetchAsync(url, "PUT", body, null)
}

function deleteAsync(url: string, body: any) {
  return callFetchAsync(url, "DELETE", body, null)
}

async function uploadPhotoAsync(apiUrl: string, filename: string, blob: Blob) {
  const formData = new FormData()
  formData.append("photo", blob, filename)

  const options = {
    method: "POST",
    body: formData
  }

  const response = await fetch(`${getServerApiUrl()}${apiUrl}`, options)

  if (response.status !== 200) {
    throw new Error(
      `Request failed with status code ${response.status}.  ${await response.text()}`
    )
  }

  return response.json()
}

export { getAsync, postAsync, putAsync, deleteAsync, uploadPhotoAsync, getServerApiUrl }
