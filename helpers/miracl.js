const projectDomain = process.env.MIRACL_ISSUER_BASE_URL;
const projectId = process.env.MIRACL_PROJECT_ID;
const serviceAccountToken = process.env.MIRACL_SERVICE_ACCOUNT_TOKEN;

module.exports.createVerification = async ({
  userId,
  redirectURI,
  clientId,
  scope = ["openid", "email"],
  state,
  confirmationUrl,
}) => {
  if (!projectDomain || !projectId || !serviceAccountToken) {
    throw new Error("Missing Miracl custom verification configuration");
  }

  const body = {
    projectId,
    userId,
    redirectURI,
    clientId,
    scope,
    delivery: "no",
  };
  if (state) body.state = state;
  if (confirmationUrl) body.confirmationUrl = confirmationUrl;

  const response = await fetch(`${projectDomain}/verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceAccountToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Miracl verification API error ${response.status}: ${text}`,
    );
  }

  return response.json();
};
