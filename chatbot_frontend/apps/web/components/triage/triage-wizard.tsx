"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  TRIAGE_CONTRACT_TYPE_OPTIONS,
  TRIAGE_DOUBT_TYPE_OPTIONS,
  TRIAGE_PROCESS_STAGE_OPTIONS,
  TRIAGE_SUBJECT_OPTIONS,
} from "@workspace/types/triage"
import type { TriageResponse } from "@workspace/types"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { StepSelect } from "@/components/triage/step-select"
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api-client"

const optionTuple = (values: readonly string[]) => values as unknown as [string, ...string[]]

const triageSchema = z.object({
  subject: z.enum(optionTuple(TRIAGE_SUBJECT_OPTIONS), { error: "Selecione um assunto." }),
  processStage: z.enum(optionTuple(TRIAGE_PROCESS_STAGE_OPTIONS), {
    error: "Selecione a etapa do processo.",
  }),
  contractType: z.enum(optionTuple(TRIAGE_CONTRACT_TYPE_OPTIONS), {
    error: "Selecione o tipo de contratação.",
  }),
  doubtType: z.enum(optionTuple(TRIAGE_DOUBT_TYPE_OPTIONS), {
    error: "Selecione a natureza da dúvida.",
  }),
  description: z
    .string()
    .min(10, "A descrição deve ter no mínimo 10 caracteres.")
    .max(2000, "A descrição deve ter no máximo 2000 caracteres."),
})

type TriageValues = z.infer<typeof triageSchema>

const STEPS = ["subject", "processStage", "contractType", "doubtType", "description"] as const
type StepField = (typeof STEPS)[number]

const STEP_TITLES: Record<StepField, string> = {
  subject: "Qual é o assunto da sua dúvida?",
  processStage: "Em qual etapa do processo você está?",
  contractType: "Qual o tipo de contratação?",
  doubtType: "Qual a natureza da sua dúvida?",
  description: "Descreva sua dúvida com mais detalhes",
}

function TriageWizard() {
  const router = useRouter()
  const [triageId, setTriageId] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<TriageValues>({
    resolver: zodResolver(triageSchema),
    defaultValues: { subject: "", processStage: "", contractType: "", doubtType: "", description: "" },
  })

  useEffect(() => {
    async function loadOrStart() {
      try {
        const active = await apiGet<TriageResponse | null>("/triage")
        const triage = active ?? (await apiPost<TriageResponse>("/triage"))

        setTriageId(triage.id)
        form.reset({
          subject: triage.subject,
          processStage: triage.processStage,
          contractType: triage.contractType,
          doubtType: triage.doubtType,
          description: triage.description,
        })

        const firstIncomplete = STEPS.findIndex((field) => !triage[field])
        setStepIndex(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete)
      } catch (error) {
        setFormError(error instanceof ApiError ? error.message : "Não foi possível carregar a triagem.")
      } finally {
        setLoading(false)
      }
    }

    void loadOrStart()
    // Runs once on mount to load-or-start the active triage; form/router are stable RHF/Next refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentField: StepField = STEPS[stepIndex]!
  const isLastStep = stepIndex === STEPS.length - 1

  async function handleAdvance() {
    setFormError(null)
    const valid = await form.trigger(currentField)
    if (!valid || !triageId) return

    setSubmitting(true)
    try {
      await apiPatch(`/triage/${triageId}`, { [currentField]: form.getValues(currentField) })

      if (isLastStep) {
        const result = await apiPost<{ conversation: { id: string } }>(`/triage/${triageId}/complete`)
        router.push(`/chat/${result.conversation.id}`)
        return
      }

      setStepIndex((index) => index + 1)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Não foi possível salvar sua resposta.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    setFormError(null)
    setStepIndex((index) => Math.max(0, index - 1))
  }

  if (loading) {
    return <p className="text-muted-foreground">Carregando triagem…</p>
  }

  return (
    <div className="w-full max-w-4xl rounded-3xl bg-card p-10 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground">Triagem</h1>

      <div className="relative mt-10 flex items-center justify-between px-2">
        <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
        {STEPS.map((step, index) => (
          <div
            key={step}
            className={cn(
              "relative z-10 flex size-9 items-center justify-center rounded-full border-2 text-sm font-medium",
              index === stepIndex
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground"
            )}
          >
            {index + 1}
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl text-foreground">{STEP_TITLES[currentField]}</h2>

      {formError ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6">
        {currentField === "subject" ? (
          <>
            <StepSelect
              options={TRIAGE_SUBJECT_OPTIONS}
              value={form.watch("subject")}
              onSelect={(value) => form.setValue("subject", value as TriageValues["subject"], { shouldValidate: true })}
            />
            {form.formState.errors.subject?.message ? (
              <p className="mt-2 text-sm text-destructive">{form.formState.errors.subject.message}</p>
            ) : null}
          </>
        ) : null}
        {currentField === "processStage" ? (
          <>
            <StepSelect
              options={TRIAGE_PROCESS_STAGE_OPTIONS}
              value={form.watch("processStage")}
              onSelect={(value) =>
                form.setValue("processStage", value as TriageValues["processStage"], { shouldValidate: true })
              }
            />
            {form.formState.errors.processStage?.message ? (
              <p className="mt-2 text-sm text-destructive">{form.formState.errors.processStage.message}</p>
            ) : null}
          </>
        ) : null}
        {currentField === "contractType" ? (
          <>
            <StepSelect
              options={TRIAGE_CONTRACT_TYPE_OPTIONS}
              value={form.watch("contractType")}
              onSelect={(value) =>
                form.setValue("contractType", value as TriageValues["contractType"], { shouldValidate: true })
              }
            />
            {form.formState.errors.contractType?.message ? (
              <p className="mt-2 text-sm text-destructive">{form.formState.errors.contractType.message}</p>
            ) : null}
          </>
        ) : null}
        {currentField === "doubtType" ? (
          <>
            <StepSelect
              options={TRIAGE_DOUBT_TYPE_OPTIONS}
              value={form.watch("doubtType")}
              onSelect={(value) => form.setValue("doubtType", value as TriageValues["doubtType"], { shouldValidate: true })}
            />
            {form.formState.errors.doubtType?.message ? (
              <p className="mt-2 text-sm text-destructive">{form.formState.errors.doubtType.message}</p>
            ) : null}
          </>
        ) : null}
        {currentField === "description" ? (
          <div className="flex flex-col gap-2">
            <Textarea
              rows={6}
              maxLength={2000}
              placeholder="Descreva sua dúvida em detalhes…"
              aria-invalid={!!form.formState.errors.description}
              {...form.register("description")}
            />
            <p className="text-right text-sm text-muted-foreground">{form.watch("description").length}/2000</p>
            {form.formState.errors.description?.message ? (
              <p className="mt-2 text-sm text-destructive">{form.formState.errors.description.message}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex justify-between">
        <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0 || submitting}>
          Voltar
        </Button>
        <Button type="button" onClick={handleAdvance} disabled={submitting}>
          {isLastStep ? "Concluir" : "Avançar"}
        </Button>
      </div>
    </div>
  )
}

export { TriageWizard }
