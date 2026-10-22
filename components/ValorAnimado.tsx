'use client'

import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { formatCentavos } from '@/lib/dinheiro'

type Props = {
  centavos: number
  className?: string
}

export function ValorAnimado({ centavos, className }: Props) {
  // Começa em zero para que o primeiro carregamento também conte (spec §8),
  // e não apenas as trocas de mês.
  const [exibido, setExibido] = useState(0)
  const anterior = useRef(0)
  const reduzirMovimento = useReducedMotion()

  useEffect(() => {
    // Com movimento reduzido não há animação: o valor é mostrado direto
    // abaixo, sem passar por estado. Só registra de onde partir se o usuário
    // religar o movimento.
    if (reduzirMovimento) {
      anterior.current = centavos
      return
    }

    const controls = animate(anterior.current, centavos, {
      duration: 0.35,
      ease: 'easeOut',
      onUpdate: (v) => setExibido(Math.round(v)),
    })

    anterior.current = centavos
    return () => controls.stop()
  }, [centavos, reduzirMovimento])

  return (
    <span className={`tabular-nums ${className ?? ''}`}>
      {formatCentavos(reduzirMovimento ? centavos : exibido)}
    </span>
  )
}
