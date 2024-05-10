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
  const imageSize = data.get("image").size || "";

  if (imageSize > 4000000) {
    return NextResponse.json(
      { message: "The image cannot exceed 4MB." },
      { status: 400 }
    );
  }

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
  //Set up the model
  let generation_config = {
    temperature: 1,
    top_p: 0.95,
    top_k: 0,
    max_output_tokens: 8192,
  };

  let safety_settings = [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ];

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
  const model = genAI.getGenerativeModel({
    model: "gemini-pro-vision",
    generationConfig: generation_config,
    safetySettings: safety_settings,
  });

  // const prompt =
  //   "Imagine you are a senior copywriter working for the best jewelry company and the best marketing boss will review you work so you need to generate a romanticized description of a jewelry image in both English (preceded by **English prompt:**) and Spanish (preceded by **Spanish prompt:**). The description should specify the type of jewelry such as earrings, hoop earrings, necklaces, bracelets, bangles, chains, rings, or brooches, whether they have charms, the colors using HTML color table names, and what metal they are made of, whether gold or platinum. The description should captivate the audience and encourage them to purchase the jewelry. ";
  const prompt =
    "Imagine you are a senior copywriter working for the best jewelry company and the best marketing boss will review you work so you need to generate a romanticized description of a jewelry image. The description should specify the type of jewelry such as earrings, hoop earrings, necklaces, bracelets, bangles, chains, rings, or brooches, whether they have charms, the colors using HTML color table names, and what metal they are made of, whether gold or platinum. The description should captivate the audience and encourage them to purchase the jewelry. give me 3 options of the same description but from diferent perspective.";

  const imageParts = [await blobToGenerativePart(ImageRequestFile, imageType)];

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = await result.response;
  const text = response.text();
  let responsejson = {};

  // console.log(text);

  if (response?.candidates[0]?.finishReason === "OTHER") {
    return NextResponse.json(
      { message: "An external error has occurred." },
      { status: 400 }
    );
  }

  // if (text) {
  //   responsejson = { message: text };

  //   if (
  //     text.includes("**English prompt:**") &&
  //     text.includes("**Spanish prompt:**")
  //   ) {
  //     let splitText = text.split("**Spanish prompt:**");

  //     let englishPrompt = splitText[0]
  //       .replace("**English prompt:**", "")
  //       .trim();
  //     let spanishPrompt = splitText[1].trim();

  //     responsejson = { message: englishPrompt, spanishMessage: spanishPrompt };

  //     // console.log({ englishPrompt, spanishPrompt }); // English text
  //   }
  // } else {
  //   return NextResponse.json({ message: "Try it again" }, { status: 400 });
  // }

  return NextResponse.json( { message: text }, { status: 200 });
}
