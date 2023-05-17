import { StackContext, Api, StaticSite } from "sst/constructs";
import * as cdk from "aws-cdk-lib";
import { getUserPolicy } from "@remotion/lambda";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const region = "us-west-1";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const hostedLayers = [
  {
    layerArn:
      "arn:aws:lambda:us-west-1:678892195805:layer:remotion-binaries-fonts-arm64",
    version: 1,
  },
  {
    layerArn:
      "arn:aws:lambda:us-west-1:678892195805:layer:remotion-binaries-ffmpeg-arm64",
    version: 1,
  },
  {
    layerArn:
      "arn:aws:lambda:us-west-1:678892195805:layer:remotion-binaries-chromium-arm64",
    version: 1,
  },
];

export function API({ stack }: StackContext) {
  const site = new StaticSite(stack, "RemotionSite", {
    path: "packages/remotion",
    buildCommand: "npm run build",
    buildOutput: "dist",
  });

  // The role used by Remotion
  const role = new cdk.aws_iam.Role(stack, "RenderExecutionRole", {
    roleName: "RenderExecutionRole",
    assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
    managedPolicies: [
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      ),
    ],
  });

  // The policy for the role (Policy content provided by @remotion/lambda)
  const userPolicy = getUserPolicy();
  const document = cdk.aws_iam.PolicyDocument.fromJson(JSON.parse(userPolicy));
  const policy = new cdk.aws_iam.Policy(stack, "RenderExecutionPolicy", {
    policyName: "remotion-render-executionrole-policy",
    document,
  });
  policy.attachToRole(role);

  // Remotion Render Function
  const assetPath = join(
    __dirname,
    "node_modules/@remotion/lambda/remotionlambda-arm64.zip"
  );

  const layers = hostedLayers.map(({ layerArn, version }) =>
    cdk.aws_lambda.LayerVersion.fromLayerVersionArn(
      stack,
      `${layerArn}-${version}`,
      `${layerArn}:${version}`
    )
  );

  const remotionRenderFunction = new cdk.aws_lambda.Function(
    stack,
    "RenderFunction",
    {
      functionName: "remotion-render-function",
      code: cdk.aws_lambda.Code.fromAsset(assetPath),
      runtime: cdk.aws_lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(120),
      memorySize: 2048,
      architecture: cdk.aws_lambda.Architecture.ARM_64,
      ephemeralStorageSize: cdk.Size.mebibytes(2048),
      role,
      layers,
      runtimeManagementMode: cdk.aws_lambda.RuntimeManagementMode.manual(
        `arn:aws:lambda:${region}::runtime:69000d3430a08938bcab71617dffcb8ea551a2cbc36c59f38c52a1ea087e461b`
      ),
    }
  );

  const api = new Api(stack, "api", {
    routes: {
      "GET /render": "packages/functions/src/render.handler",
    },
    defaults: {
      function: {
        environment: {
          SERVE_URL: `${site.url}/index.html`,
          FUNCTION_NAME: "remotion-render-function",
        },
        role, // ideally the function is binded automatically
      },
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
