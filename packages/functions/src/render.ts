import { ApiHandler } from "sst/node/api";
import { renderMediaOnLambda } from "@remotion/lambda/client";

export const handler = ApiHandler(async () => {
  const { folderInS3Console } = await renderMediaOnLambda({
    region: "us-west-1",
    functionName: process.env.FUNCTION_NAME!,
    composition: "MyComp",
    serveUrl: process.env.SERVE_URL!,
    codec: "h264",
  });

  return {
    body: JSON.stringify({
      url: folderInS3Console,
    }),
  };
});
