import { Innertube } from 'youtubei.js'

let clientPromise = null

export async function getYouTubeClient () {
  if (!clientPromise) {
    clientPromise = Innertube.create().catch(error => {
      /*
       * Uma falha não deve envenenar o processo para sempre;
       * a próxima chamada tenta de novo.
       */
      clientPromise = null

      throw error
    })
  }

  return await clientPromise
}

export function resetYouTubeClient () {
  clientPromise = null
}
