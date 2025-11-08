// IMPORTANT: Storing API keys in frontend code is insecure and should be avoided in production.
// This key should be stored in a secure backend or environment variable that is not exposed to the client.
const ELEVENLABS_API_KEY = "sk_b11564da28f9d9cb5d589970517541f800697fe489be6ae0";
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // A standard, clear voice (Rachel)

/**
 * Converts text to speech using the ElevenLabs API.
 * @param text The text to convert to speech.
 * @returns A promise that resolves to an audio Blob.
 */
export const textToSpeech = async (text: string): Promise<Blob> => {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.7,
            },
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("ElevenLabs API Error:", errorBody);
        throw new Error(`ElevenLabs API request failed with status ${response.status}`);
    }

    const audioBlob = await response.blob();
    return audioBlob;
};
