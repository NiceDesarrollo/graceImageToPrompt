import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request) {
  const session = await getServerSession(request);

  if (!session) {
    return NextResponse.json({ message: "Please log in" }, { status: 401 });
  }

  const data = await request.formData();
  const imageType = data.get("image").type || "";
  const ImageRequestFile = data.get("image");

  let imageExtension = imageType.split("/");
  imageExtension = imageExtension[1];

  if (
    imageExtension != "webp" &&
    imageExtension != "jpeg" &&
    imageExtension != "png" &&
    imageExtension != "jpg"
  ) {
    return NextResponse.json(
      {
        message:
          "Invalid image extension. Please upload an image with .webp, .jpeg, .png, or .jpg extension.",
      },
      { status: 500 }
    );
  }

  // Access your API key as an environment variable (see "Set up your API key" above)
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI);

  async function blobToGenerativePart(blob, mimeType) {
    const arrayBuffer = await blob.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString("base64"),
        mimeType,
      },
    };
  }

  // For text-and-image input (multimodal), use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const prompt =
    "Give me a prompt to generate a romanticized description of a jewelry image, specifying the type of jewelry such as earrings, hoop earrings, necklaces, bracelets, bangles, chains, rings, or brooches, whether they have charms. give me the colors using the HTML color table names, and what metal they are made of, whether gold or platinum.  It should provide a description that captivates the audience into purchasing the jewelry."

  const imageParts = [await blobToGenerativePart(ImageRequestFile, imageType)];

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();

  // For text-only input, use the gemini-pro model
  // const modelForText = genAI.getGenerativeModel({ model: "gemini-pro" });
  // const promptForText = "Do you can translate this text to spanish?: " + text;
  // const resultForText = await modelForText.generateContent(promptForText);
  // console.log(resultForText.response.text())
  // const responseForText = await resultForText.response;
  // const textForText = responseForText.text();

  return NextResponse.json(
    { message: text },
    { status: 200 }
  );
}
