import { useEffect, useMemo, useState } from 'react'
import { Loader } from '@mantine/core'
import type { ProviderModel } from '../../types'
import styles from '../../routes/Book.module.css'

export function ModelPicker({
  onSelect,
  onCancel,
}: {
  onSelect: (providerId: string, modelId: string) => void
  onCancel: () => void
}) {
  const [models, setModels] = useState<ProviderModel[] | null>(null)
  const providerId = useMemo(() => localStorage.getItem('readingisfun:provider') ?? '', [])

  useEffect(() => {
    if (!providerId) return
    const ac = new AbortController()
    fetch(`/api/auth/models/${providerId}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data: { models: ProviderModel[] }) => setModels(data.models))
      .catch(() => {})
    return () => ac.abort()
  }, [providerId])

  if (!models) {
    return (
      <div className={styles.modelPicker}>
        <Loader size="xs" color="var(--accent)" />
      </div>
    )
  }

  return (
    <div className={styles.modelPicker}>
      <div className={styles.modelPickerHeader}>
        <span className={styles.modelPickerTitle}>Pick a model</span>
        <button className={styles.modelPickerClose} onClick={onCancel}>
          &times;
        </button>
      </div>
      <div className={styles.modelPickerList}>
        {models.map((m) => (
          <button
            key={m.id}
            className={styles.modelPickerItem}
            onClick={() => onSelect(providerId, m.id)}
          >
            <span className={styles.modelPickerName}>{m.name}</span>
            <span className={styles.modelPickerMeta}>
              ${m.inputCost.toFixed(2)} / ${m.outputCost.toFixed(2)} per 1M
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
