<script setup lang="ts">
import { h, resolveComponent, ref, computed } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { Instance } from '../../shared/types/Instance'

const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

// Composable do Toast (auto-importado pelo Nuxt UI)
const toast = useToast()

interface Props {
  instances: readonly Instance[]
  loading: boolean
  error: string | null
}

const props = defineProps<Props>()

// Estado para o filtro de pesquisa
const searchToken = ref('')

// Estado para o filtro de aluno
const filtroAluno = ref<'todos' | 'alunos' | 'nao-alunos'>('todos')

// Estado para o modal de instância
const showModal = ref(false)
const selectedInstance = ref<Instance | null>(null)

// Estado para controlar a busca no Supabase
const loadingSupabase = ref(false)
const tokensSupabase = ref<string[]>([])
const instanciasSupabase = ref<{ token: string; aluno: boolean; status_conta: string; uuid: string }[]>([])

// Função para buscar tokens do Supabase
async function buscarTokensSupabase() {
  loadingSupabase.value = true
  
  try {
    const response = await $fetch<{
      success: boolean
      data: { token: string; aluno: boolean; status_conta: string; uuid: string }[]
      total: number
    }>('/api/instancias-provider4')
    
    if (response.success && response.data) {
      // Armazena as instâncias completas do Supabase
      instanciasSupabase.value = response.data
      
      // Extrai apenas os tokens para compatibilidade
      tokensSupabase.value = response.data.map((item) => item.token)
      
      toast.add({
        title: 'Busca concluída!',
        description: `${response.total} token(s) encontrado(s) no Supabase`,
        icon: 'i-lucide-check-circle',
        color: 'success'
      })
    }
  } catch (error) {
    console.error('Erro ao buscar tokens do Supabase:', error)
    toast.add({
      title: 'Erro ao buscar tokens',
      description: 'Não foi possível buscar os tokens do Supabase',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    loadingSupabase.value = false
  }
}

// Função para abrir modal com detalhes da instância
function openInstanceModal(row: TableRow<Instance>) {
  console.log('Abrindo modal para instância:', row.original.name)
  console.log('Estado atual do modal antes:', showModal.value)
  console.log('Instância selecionada antes:', selectedInstance.value)
  
  selectedInstance.value = row.original
  showModal.value = true
  
  console.log('Estado atual do modal depois:', showModal.value)
  console.log('Instância selecionada depois:', selectedInstance.value)
}



// Computed para filtrar instâncias por token
const filteredInstances = computed(() => {
  if (!props.instances) return []
  
  let filtered = [...props.instances]
  
  // Filtro por token
  if (searchToken.value.trim()) {
    filtered = filtered.filter(instance => 
      instance.token.toLowerCase().includes(searchToken.value.toLowerCase().trim())
    )
  }
  
  return filtered
})

// Estado para controlar a ordenação
const sorting = ref([{
  id: 'status',
  desc: false
}])

// Computed para ordenar instâncias (removido a ordenação manual pois o TanStack Table vai gerenciar)
const sortedInstances = computed(() => {
  if (!filteredInstances.value) return []
  
  // Mapeia as instâncias e atualiza os campos 'existe', 'aluno', 'status_conta' e 'uuid' baseado nos dados do Supabase
  let instances = filteredInstances.value.map(instance => {
    const instanciaSupabase = instanciasSupabase.value.find(item => item.token === instance.token)
    
    return {
      ...instance,
      existe: !!instanciaSupabase,
      aluno: instanciaSupabase?.aluno || false,
      status_conta: (instanciaSupabase?.status_conta || '') as Instance['status_conta'],
      uuid: instanciaSupabase?.uuid || ''
    }
  })
  
  // Filtro por aluno
  if (filtroAluno.value === 'alunos') {
    instances = instances.filter(instance => instance.aluno === true)
  } else if (filtroAluno.value === 'nao-alunos') {
    instances = instances.filter(instance => instance.aluno === false)
  }
  
  return instances
})

// Computed para contar status
const statusCounts = computed(() => {
  const connected = filteredInstances.value.filter(i => i.status.toLowerCase() === 'connected').length
  const total = filteredInstances.value.length
  const disconnected = total - connected
  
  return { connected, disconnected, total }
})

// Computed para contar alunos (baseado em sortedInstances antes do filtro de aluno)
const alunoCounts = computed(() => {
  // Mapear com os dados do Supabase primeiro
  const instancesComSupabase = filteredInstances.value.map(instance => {
    const instanciaSupabase = instanciasSupabase.value.find(item => item.token === instance.token)
    return {
      ...instance,
      aluno: instanciaSupabase?.aluno || false
    }
  })
  
  const alunos = instancesComSupabase.filter(i => i.aluno === true).length
  const naoAlunos = instancesComSupabase.filter(i => i.aluno === false).length
  const total = instancesComSupabase.length
  
  return { alunos, naoAlunos, total }
})



// Definir as colunas da tabela
const columns: TableColumn<Instance>[] = [
  {
    accessorKey: 'profilePicUrl',
    header: 'Foto',
    cell: ({ row }) => {
      const instance = row.original
      return h(UAvatar, {
        src: instance.profilePicUrl || undefined,
        alt: instance.profileName || instance.name,
        size: 'lg',
        icon: !instance.profilePicUrl ? 'i-lucide-user' : undefined
      })
    }
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Nome',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      const instance = row.original
      return h('div', { class: 'font-medium max-w-32 truncate' }, instance.name)
    },
    meta: {
      class: {
        th: 'w-32',
        td: 'w-32'
      }
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Status',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      const instance = row.original
      const color = getStatusColor(instance.status)
      
      return h(UBadge, {
        color,
        variant: 'subtle',
        class: 'capitalize'
      }, () => getStatusLabel(instance.status))
    }
  },
  {
    accessorKey: 'created',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Criada em',
        icon: isSorted ? (isSorted === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow') : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({ row }) => {
      const instance = row.original
      const createdDate = new Date(instance.created)
      
      return h('div', { class: 'text-sm' }, [
        h('div', { class: 'font-medium' }, createdDate.toLocaleDateString('pt-BR')),
        h('div', { class: 'text-xs text-gray-500 dark:text-gray-400' }, 
          createdDate.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        )
      ])
    },
    meta: {
      class: {
        th: 'w-28',
        td: 'w-28'
      }
    }
  },
  {
    accessorKey: 'token',
    header: 'Token',
    cell: ({ row }) => {
      const instance = row.original
      
      return h('div', { class: 'flex items-center gap-2' }, [
        h('code', { 
          class: 'text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded max-w-24 truncate'
        }, instance.token.substring(0, 12) + '...'),
        h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          icon: 'i-lucide-copy',
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(instance.token)
              toast.add({
                title: 'Token copiado!',
                description: `Token da instância ${instance.name} copiado para a área de transferência`,
                icon: 'i-lucide-check-circle',
                color: 'success'
              })
            } catch (error) {
              toast.add({
                title: 'Erro ao copiar',
                description: 'Não foi possível copiar o token para a área de transferência',
                icon: 'i-lucide-alert-circle',
                color: 'error'  
              })
            }
          }
        })
      ])
    }
  },
  {
    accessorKey: 'uuid',
    header: 'UUID',
    cell: ({ row }) => {
      const instance = row.original
      
      // Se não tiver UUID, não exibe nada
      if (!instance.uuid) {
        return h('div', { class: 'text-gray-400' }, '-')
      }
      
      return h('div', { class: 'flex items-center gap-2' }, [
        h('code', { 
          class: 'text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded max-w-24 truncate'
        }, instance.uuid.substring(0, 8) + '...'),
        h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          icon: 'i-lucide-copy',
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(instance.uuid)
              toast.add({
                title: 'UUID copiado!',
                description: `UUID da instância ${instance.name} copiado para a área de transferência`,
                icon: 'i-lucide-check-circle',
                color: 'success'
              })
            } catch (error) {
              toast.add({
                title: 'Erro ao copiar',
                description: 'Não foi possível copiar o UUID para a área de transferência',
                icon: 'i-lucide-alert-circle',
                color: 'error'  
              })
            }
          }
        })
      ])
    }
  },
  {
    accessorKey: 'existe',
    header: 'Existe',
    cell: ({ row }) => {
      const instance = row.original
      return h(UBadge, {
        color: instance.existe ? 'success' : 'error',
        variant: 'subtle',
        class: 'capitalize'
      }, () => instance.existe ? 'Sim' : 'Não')
    }
  },
  {
    accessorKey: 'aluno',
    header: 'Aluno',
    cell: ({ row }) => {
      const instance = row.original
      return h(UBadge, {
        color: instance.aluno ? 'info' : 'neutral',
        variant: 'subtle',
        class: 'capitalize'
      }, () => instance.aluno ? 'Sim' : 'Não')
    }
  },
  {
    accessorKey: 'status_conta',
    header: 'Status Conta',
    cell: ({ row }) => {
      const instance = row.original
      const statusConta = instance.status_conta
      
      // Determina cor e label baseado no status da conta
      let color: 'success' | 'warning' | 'error' | 'neutral' | 'info' = 'neutral'
      let label = '-'
      
      switch (statusConta) {
        case 'ativa':
          color = 'success'
          label = 'Ativa'
          break
        case 'trial':
          color = 'info'
          label = 'Trial'
          break
        case 'pendente':
          color = 'warning'
          label = 'Pendente'
          break
        case 'vencida':
          color = 'warning'
          label = 'Vencida'
          break
        case 'cancelada':
          color = 'error'
          label = 'Cancelada'
          break
      }
      
      return h(UBadge, {
        color,
        variant: 'subtle',
        class: 'capitalize'
      }, () => label)
    }
  }
]

// Função para determinar a cor do status
function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'connected':
      return 'success'
    case 'disconnected':
      return 'error'
    case 'connecting':
      return 'warning'
    default:
      return 'neutral'
  }
}

// Função para obter o label do status
function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'connected':
      return 'Conectado'
    case 'disconnected':
      return 'Desconectado'
    case 'connecting':
      return 'Conectando'
    default:
      return status
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header da seção -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Instâncias WhatsApp
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Lista de todas as instâncias ativas no servidor · Clique em uma linha para ver detalhes
        </p>
      </div>
      
      <!-- Badges com estatísticas -->
      <div v-if="!loading && !error" class="flex items-center gap-2">
        <UBadge variant="subtle" color="success">
          {{ statusCounts.connected }} conectada{{ statusCounts.connected !== 1 ? 's' : '' }}
        </UBadge>
        <UBadge variant="subtle" color="error">
          {{ statusCounts.disconnected }} desconectada{{ statusCounts.disconnected !== 1 ? 's' : '' }}
        </UBadge>
        <UBadge variant="subtle" color="neutral">
          {{ statusCounts.total }} total
        </UBadge>
        
        <!-- Mostrar estatísticas de aluno apenas se já buscou do Supabase -->
        <template v-if="instanciasSupabase.length > 0">
          <div class="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          <UBadge variant="subtle" color="info">
            {{ alunoCounts.alunos }} aluno{{ alunoCounts.alunos !== 1 ? 's' : '' }}
          </UBadge>
          <UBadge variant="subtle" color="neutral">
            {{ alunoCounts.naoAlunos }} não aluno{{ alunoCounts.naoAlunos !== 1 ? 's' : '' }}
          </UBadge>
        </template>
      </div>
    </div>

    <!-- Campo de pesquisa -->
    <div v-if="!loading && !error && props.instances.length > 0" class="flex items-center gap-3">
      <UInput
        v-model="searchToken"
        placeholder="Pesquisar por token..."
        icon="i-lucide-search"
        class="flex-1 max-w-sm"
      />
      <UButton
        v-if="searchToken"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        size="sm"
        @click="searchToken = ''"
      >
        Limpar
      </UButton>
      
      <!-- Filtros de aluno (visível apenas após buscar no Supabase) -->
      <div v-if="instanciasSupabase.length > 0" class="flex items-center gap-2">
        <UButton
          :color="filtroAluno === 'todos' ? 'primary' : 'neutral'"
          :variant="filtroAluno === 'todos' ? 'solid' : 'outline'"
          size="sm"
          @click="filtroAluno = 'todos'"
        >
          Todos
        </UButton>
        <UButton
          :color="filtroAluno === 'alunos' ? 'info' : 'neutral'"
          :variant="filtroAluno === 'alunos' ? 'solid' : 'outline'"
          size="sm"
          icon="i-lucide-graduation-cap"
          @click="filtroAluno = 'alunos'"
        >
          Alunos
        </UButton>
        <UButton
          :color="filtroAluno === 'nao-alunos' ? 'neutral' : 'neutral'"
          :variant="filtroAluno === 'nao-alunos' ? 'solid' : 'outline'"
          size="sm"
          icon="i-lucide-user"
          @click="filtroAluno = 'nao-alunos'"
        >
          Não Alunos
        </UButton>
      </div>
      
      <!-- Botão para buscar tokens do Supabase -->
      <UButton
        color="primary"
        variant="outline"
        icon="i-lucide-database"
        :loading="loadingSupabase"
        @click="buscarTokensSupabase"
      >
        {{ loadingSupabase ? 'Buscando...' : 'Verificar no Supabase' }}
      </UButton>
    </div>

    <!-- Tabela -->
    <UCard>
      <!-- Estado de carregamento -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="text-center">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Carregando instâncias...
          </p>
        </div>
      </div>

      <!-- Estado de erro -->
      <div v-else-if="error" class="flex items-center justify-center py-8">
        <div class="text-center">
          <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-error mx-auto mb-3" />
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Erro ao carregar instâncias
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ error }}
          </p>
        </div>
      </div>

      <!-- Estado vazio -->
      <div v-else-if="sortedInstances.length === 0" class="flex items-center justify-center py-8">
        <div class="text-center">
          <UIcon 
            :name="searchToken ? 'i-lucide-search-x' : 'i-lucide-smartphone'" 
            class="w-8 h-8 text-gray-400 mx-auto mb-3" 
          />
          <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {{ searchToken ? 'Nenhuma instância encontrada' : 'Nenhuma instância encontrada' }}
          </h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ searchToken 
              ? `Nenhuma instância possui o token "${searchToken}"` 
              : 'Este servidor não possui instâncias WhatsApp ativas' 
            }}
          </p>
          <UButton
            v-if="searchToken"
            color="neutral"
            variant="outline"
            size="sm"
            class="mt-3"
            @click="searchToken = ''"
          >
            Limpar pesquisa
          </UButton>
        </div>
      </div>

      <!-- Tabela com dados -->
      <UTable
        v-else
        v-model:sorting="sorting"
        :data="sortedInstances"
        :columns="columns"
        class="w-full"
        :ui="{ tr: 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' }"
        @select="openInstanceModal"
      />
    </UCard>

    <!-- Modal de detalhes da instância -->
    <InstanciaModal
      :instance="selectedInstance"
      v-model:open="showModal"
    />
  </div>
</template>
