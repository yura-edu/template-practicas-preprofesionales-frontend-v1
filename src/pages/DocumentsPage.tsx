import { type ChangeEvent, type FormEvent, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ApiError, api } from '@/api/client'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseLocalDate } from '@/lib/date'
import { db, type LocalDocument } from '@/offline/db'
import { usePlacement } from '@/offline/hooks/usePlacement'

type DocumentKind = 'AGREEMENT' | 'INSURANCE' | 'REPORT' | 'EVIDENCE'

// Espejo de REQUIRED_DOCS en el backend (placement.service.ts): estos dos son
// los únicos que bloquean la activación de la práctica.
const REQUIRED_KINDS: DocumentKind[] = ['AGREEMENT', 'INSURANCE']

const KIND_LABEL: Record<DocumentKind, string> = {
  AGREEMENT: 'Convenio',
  INSURANCE: 'Seguro',
  REPORT: 'Informe',
  EVIDENCE: 'Evidencia',
}

function formatDate(dateValue: string): string {
  const parsed = parseLocalDate(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

export function DocumentsPage() {
  const placement = usePlacement()
  const documents = useLiveQuery<LocalDocument[] | undefined>(async () => {
    if (!placement) return undefined
    return db.documents.where('placementId').equals(placement.id).toArray()
  }, [placement?.id])

  const [kind, setKind] = useState<DocumentKind>('AGREEMENT')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (placement === undefined) {
    return <p className="font-display text-16 text-inkSoft">Cargando tu práctica…</p>
  }

  if (placement === null) {
    return <p className="font-display text-16 text-inkSoft">No tienes una práctica activa todavía.</p>
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUploadError(null)

    if (!file) {
      setUploadError('Selecciona un archivo')
      return
    }

    setUploading(true)
    try {
      const created = await api<LocalDocument>(`/placements/${placement!.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          kind,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          // No hay almacenamiento de archivos real en este template: es un
          // identificador de referencia, no una URL donde recuperar el
          // archivo. Cada equipo conecta su propio storage sobre este campo.
          storageKey: crypto.randomUUID(),
        }),
      })
      await db.documents.put(created)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'No se pudo subir el documento')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
  }

  const requiredStatus = (docKind: DocumentKind) =>
    documents
      ?.filter((doc) => doc.kind === docKind)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]?.status ?? null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-20 text-ink">Documentos</h1>

      <section className="border border-paperRule bg-surface">
        <h2 className="border-b border-paperRule px-3 py-2 font-display text-14 uppercase tracking-wide text-inkSoft">
          Obligatorios para activar la práctica
        </h2>
        <div className="divide-y divide-paperRule">
          {REQUIRED_KINDS.map((requiredKind) => {
            const status = documents === undefined ? undefined : requiredStatus(requiredKind)
            return (
              <div key={requiredKind} className="flex items-center justify-between px-3 py-2">
                <span className="text-14 text-ink">{KIND_LABEL[requiredKind]}</span>
                {documents === undefined ? (
                  <span className="font-data text-12 text-inkSoft">Cargando…</span>
                ) : status ? (
                  <StatusBadge status={status} />
                ) : (
                  <span className="font-data text-12 uppercase text-void">Falta subir</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="border border-paperRule bg-surface p-4">
        <h2 className="font-display text-14 uppercase tracking-wide text-inkSoft">Subir documento</h2>
        <p className="mt-1 font-data text-12 text-inkSoft">
          A diferencia del libro de horas, la carga de documentos necesita conexión: no se guarda en este dispositivo
        </p>

        <form className="mt-3 flex flex-col gap-3" onSubmit={handleUpload} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="document-kind">Tipo de documento</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as DocumentKind)}>
              <SelectTrigger id="document-kind" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_LABEL) as DocumentKind[]).map((kindOption) => (
                  <SelectItem key={kindOption} value={kindOption}>
                    {KIND_LABEL[kindOption]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="document-file">Archivo</Label>
            <input
              id="document-file"
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="font-data text-14 text-ink file:mr-3 file:border file:border-paperRule file:bg-paper file:px-3 file:py-1.5 file:font-display file:text-14 file:text-ink"
            />
          </div>

          {uploadError ? (
            <p role="alert" className="text-14 text-void">
              {uploadError}
            </p>
          ) : null}

          <Button type="submit" disabled={uploading} className="self-start">
            {uploading ? 'Subiendo…' : 'Subir documento'}
          </Button>
        </form>
      </section>

      <section className="border border-paperRule bg-surface">
        <h2 className="border-b border-paperRule px-3 py-2 font-display text-14 uppercase tracking-wide text-inkSoft">
          Todos tus documentos
        </h2>
        {documents === undefined ? (
          <p className="px-3 py-4 font-display text-14 text-inkSoft">Cargando documentos…</p>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <p className="font-display text-16 text-ink">Todavía no has subido documentos</p>
            <p className="font-display text-14 text-inkSoft">Empieza por el convenio y el seguro</p>
          </div>
        ) : (
          <div className="divide-y divide-paperRule">
            {documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-14 text-ink">{doc.filename}</span>
                  <span className="font-data text-12 uppercase text-inkSoft">
                    {KIND_LABEL[doc.kind as DocumentKind] ?? doc.kind} · {formatDate(doc.updatedAt)}
                  </span>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
