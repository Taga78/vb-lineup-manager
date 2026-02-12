import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function SupabaseDebugPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('players')
    .select('id, name, gender, skill_service, skill_pass, skill_attack, skill_defense')
    .limit(10)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-4">
        Test connexion Supabase
      </h1>

      {error && (
        <p className="text-red-600 mb-2">
          Erreur Supabase : {error.message}
        </p>
      )}

      {!error && (!data || data.length === 0) && (
        <p className="text-gray-600">
          Aucune entrée dans la table <code>players</code> pour le moment.
        </p>
      )}

      {!error && data && data.length > 0 && (
        <div className="w-full max-w-md mt-4 border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Joueurs trouvés :</h2>
          <ul className="space-y-1 text-sm">
            {data.map((player) => (
              <li key={player.id} className="flex justify-between">
                <span>{player.name}</span>
                <span className="text-gray-500">
                  {player.gender ?? '–'} · S{player.skill_service} P{player.skill_pass} A{player.skill_attack} D{player.skill_defense}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  )
}
