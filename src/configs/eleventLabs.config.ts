import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"


export const createElevenLabClient = (apiKey:string ) => {
    const elevenLabClient = new ElevenLabsClient({
        apiKey:apiKey,
        environment:"https://api.elevenlabs.io"
    })

    return elevenLabClient;
}
