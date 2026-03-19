export async function getFrames() {

    const response = await fetch("http://127.0.0.1:8000/frames")

    return await response.json()

}