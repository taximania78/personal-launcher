import { useState, type Dispatch, type SetStateAction } from 'react'

// `useState(initial)` ne relit jamais sa prop : après un `router.refresh()`,
// le Server Component renvoie des données fraîches mais le composant client
// garde sa copie locale périmée. Ce hook réaligne l'état local à chaque
// nouvelle référence de `serverValue` (pattern React « adjusting state when a
// prop changes » : setState pendant le rendu, pas d'effet, pas de rendu
// intermédiaire visible).
//
// `frozen` : une mutation optimiste est en vol → on ignore ce snapshot plutôt
// que d'écraser l'action en cours (il daterait d'avant la mutation). Le
// snapshot est marqué vu : il ne sera pas rejoué après coup, le prochain
// refresh réconciliera.
export function useServerState<T>(
  serverValue: T,
  { frozen = false }: { frozen?: boolean } = {},
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(serverValue)
  const [seen, setSeen] = useState(serverValue)
  if (serverValue !== seen) {
    setSeen(serverValue)
    if (!frozen) setValue(serverValue)
  }
  return [value, setValue]
}
