import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Busca todas as instâncias do Supabase com provider=4
 * Retorna o token, aluno, status_conta e uuid de cada instância
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  try {
    const { data, error } = await supabase
      .from('dify_instancias_view2')
      .select('token, aluno, status_conta, uuid')
      .eq('provider', 4)

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Erro ao buscar instâncias do Supabase',
        data: error
      })
    }

    return {
      success: true,
      data: data || [],
      total: data?.length || 0
    }
  } catch (err) {
    console.error('Erro ao buscar instâncias provider=4:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erro interno ao buscar instâncias',
      data: err
    })
  }
})
