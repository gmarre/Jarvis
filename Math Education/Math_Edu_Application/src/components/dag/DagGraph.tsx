import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
  type NodeMouseHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { levelRank } from '@/content'
import { cn } from '@/lib/cn'
import { statusOf, type ProgressMap } from '@/lib/dag'
import { splitLevel } from '@/lib/format'
import { IconMinus, IconPlus } from '@/components/ui/icons'
import type { Skill } from '@/types/content'
import type { SkillStatus } from '@/types/domain'

// Vue DAG, variante A des maquettes (1i) : le graphe d'un domaine, range par
// niveau scolaire. Jamais les 414 competences d'un coup, c'est la regle posee
// dans le brief : on rend un domaine a la fois, sinon plus rien n'est lisible.

const NODE_WIDTH = 168
const NODE_HEIGHT = 62
const COLUMN_GAP = 24
const ROW_GAP = 74

interface SkillNodeData {
  skill: Skill
  status: SkillStatus
  isRootGap: boolean
  isTarget: boolean
  isSelected: boolean
}

const STATUS_STYLES: Record<SkillStatus, string> = {
  mastered: 'bg-mastered-50 border border-mastered-200 text-mastered-900',
  in_progress: 'bg-progress-50 border border-progress-200 text-progress-900',
  available: 'bg-surface border border-line text-ink',
  locked: 'bg-locked-50 border border-dashed border-locked-200 text-ink-muted',
}

const STATUS_CAPTION: Record<SkillStatus, string> = {
  mastered: 'Maîtrisé',
  in_progress: 'En cours',
  available: 'À travailler',
  locked: 'Verrouillé',
}

const CAPTION_STYLES: Record<SkillStatus, string> = {
  mastered: 'text-mastered-700',
  in_progress: 'text-progress-700',
  available: 'text-ink-subtle',
  locked: 'text-ink-faint',
}

function SkillNode({ data }: NodeProps<SkillNodeData>) {
  const { skill, status, isRootGap, isTarget, isSelected } = data
  const { base, sup } = splitLevel(skill.school_level)

  return (
    <div
      className={cn(
        'flex cursor-pointer flex-col justify-center rounded-[14px] px-3 py-2 transition',
        STATUS_STYLES[status],
        isRootGap && 'border-2 border-accent bg-surface shadow-accent',
        isTarget && 'border-2 border-ink bg-surface',
        isSelected && !isRootGap && 'ring-2 ring-accent ring-offset-2 ring-offset-canvas',
      )}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-locked-200" />
      <p className="line-clamp-2 text-[12px] font-semibold leading-tight">{skill.label}</p>
      <p
        className={cn(
          'mt-1 text-[10.5px] leading-none',
          isRootGap ? 'text-accent' : isTarget ? 'text-ink-subtle' : CAPTION_STYLES[status],
        )}
      >
        {isRootGap ? 'Lacune racine' : isTarget ? 'Objectif' : STATUS_CAPTION[status]} · {base}
        {sup && <sup className="sup">{sup}</sup>}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-1 !w-1 !border-0 !bg-locked-200"
      />
    </div>
  )
}

const nodeTypes = { skill: SkillNode }

export interface DagGraphProps {
  skills: Skill[]
  progress: ProgressMap
  rootGapIds: string[]
  targetId: string | null
  selectedId: string | null
  onSelect: (skillId: string) => void
}

/** Rangees par niveau scolaire : une ligne du graphe = un niveau du cursus. */
function buildLayout(
  skills: Skill[],
  progress: ProgressMap,
  rootGapIds: string[],
  targetId: string | null,
  selectedId: string | null,
): { nodes: Node<SkillNodeData>[]; edges: Edge[]; rowLabels: { label: string; y: number }[] } {
  const rows = new Map<string, Skill[]>()
  for (const skill of skills) {
    const list = rows.get(skill.school_level)
    if (list) list.push(skill)
    else rows.set(skill.school_level, [skill])
  }

  const orderedLevels = [...rows.keys()].sort(
    (a, b) => levelRank(a as Skill['school_level']) - levelRank(b as Skill['school_level']),
  )

  const nodes: Node<SkillNodeData>[] = []
  const rowLabels: { label: string; y: number }[] = []
  const positions = new Map<string, { x: number; y: number }>()

  orderedLevels.forEach((level, rowIndex) => {
    const y = rowIndex * (NODE_HEIGHT + ROW_GAP)
    rowLabels.push({ label: level, y })

    const rowSkills = [...(rows.get(level) ?? [])].sort(
      (a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id),
    )

    rowSkills.forEach((skill, columnIndex) => {
      const x = columnIndex * (NODE_WIDTH + COLUMN_GAP)
      positions.set(skill.id, { x, y })
      nodes.push({
        id: skill.id,
        type: 'skill',
        position: { x, y },
        draggable: false,
        data: {
          skill,
          status: statusOf(progress, skill.id),
          isRootGap: rootGapIds.includes(skill.id),
          isTarget: skill.id === targetId,
          isSelected: skill.id === selectedId,
        },
      })
    })
  })

  const visible = new Set(skills.map((s) => s.id))
  const edges: Edge[] = []

  for (const skill of skills) {
    for (const prereq of skill.prerequisites) {
      // Les prerequis venant d'un autre domaine ne sont pas affiches ici : le
      // graphe reste celui d'un domaine, c'est ce qui le garde lisible.
      if (!visible.has(prereq)) continue

      const highlighted = rootGapIds.includes(skill.id) || rootGapIds.includes(prereq)
      edges.push({
        id: `${prereq}-${skill.id}`,
        source: prereq,
        target: skill.id,
        type: 'smoothstep',
        animated: highlighted,
        style: {
          stroke: highlighted ? '#6366F1' : '#CBD5E1',
          strokeWidth: highlighted ? 2 : 1.5,
          strokeDasharray: highlighted ? '5 4' : undefined,
        },
      })
    }
  }

  return { nodes, edges, rowLabels }
}

function DagGraphInner({
  skills,
  progress,
  rootGapIds,
  targetId,
  selectedId,
  onSelect,
}: DagGraphProps) {
  const { zoomIn, zoomOut } = useReactFlow()

  const { nodes, edges, rowLabels } = useMemo(
    () => buildLayout(skills, progress, rootGapIds, targetId, selectedId),
    [skills, progress, rootGapIds, targetId, selectedId],
  )

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => onSelect(node.id),
    [onSelect],
  )

  return (
    <div className="relative h-full w-full overflow-hidden rounded-panel border border-line bg-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        minZoom={0.35}
        maxZoom={1.4}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        className="bg-surface"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#EDEAE3" />
      </ReactFlow>

      {/* Reperes de niveau scolaire, cales sur les rangees. */}
      <ul className="pointer-events-none absolute left-4 top-4 space-y-1 rounded-xl bg-canvas/85 px-3 py-2 backdrop-blur-sm">
        {rowLabels.map((row) => (
          <li
            key={row.label}
            className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint"
          >
            {row.label}
          </li>
        ))}
      </ul>

      <div className="absolute bottom-4 right-4 flex gap-1.5">
        <ZoomButton label="Dézoomer" onClick={() => zoomOut()}>
          <IconMinus size={16} />
        </ZoomButton>
        <ZoomButton label="Zoomer" onClick={() => zoomIn()}>
          <IconPlus size={16} />
        </ZoomButton>
      </div>
    </div>
  )
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-[9px] border border-line bg-surface text-ink-muted transition hover:bg-muted"
    >
      {children}
    </button>
  )
}

export function DagGraph(props: DagGraphProps) {
  return (
    <ReactFlowProvider>
      <DagGraphInner {...props} />
    </ReactFlowProvider>
  )
}
