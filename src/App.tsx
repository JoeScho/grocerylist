import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { BottomNav, type Tab } from './components/BottomNav'
import { ALL } from './components/LabelTabs'
import { useConfetti } from './components/Confetti'
import { useToast } from './components/Toast'
import { addStaple, removeStaple, useAuth, useHousehold, useInvites } from './data/household'
import { createRecipe, deleteRecipe, updateRecipe, useRecipes } from './data/recipes'
import { addRecipeToShop, removeRecipeFromShop, useItems, usePlan } from './data/shop'
import { AddRecipeSheet } from './screens/AddRecipeSheet'
import { AddToShopSheet } from './screens/AddToShopSheet'
import { LabelsSheet } from './screens/LabelsSheet'
import { RecipeDetail } from './screens/RecipeDetail'
import { RecipeEditor } from './screens/RecipeEditor'
import { Loading, Recipes } from './screens/Recipes'
import { Settings } from './screens/Settings'
import { Shop } from './screens/Shop'
import { Week } from './screens/Week'
import { SignIn } from './screens/SignIn'
import type { Household, RecipeDraft } from './types'

type Route =
  | { name: Tab }
  | { name: 'settings' }
  | { name: 'recipe'; id: string }
  | { name: 'edit'; id?: string; draft: RecipeDraft; warning?: string }

// Each screen change is pushed to browser history so the phone's back gesture works.
function useRoute() {
  const [route, setRoute] = useState<Route>(() => (history.state?.route as Route) ?? { name: 'recipes' })
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setRoute((e.state?.route as Route) ?? { name: 'recipes' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = useCallback((r: Route, replace = false) => {
    if (replace) history.replaceState({ route: r }, '')
    else history.pushState({ route: r }, '')
    setRoute(r)
    window.scrollTo({ top: 0 })
  }, [])
  return { route, go, back: () => history.back() }
}

export default function App() {
  const user = useAuth()
  const { household, error } = useHousehold(user)

  if (user === undefined) return <Loading />
  if (!user) return <SignIn />
  if (error) return <div className="screen"><div className="error-box">Something went wrong loading your list: {error}</div></div>
  if (!household) return <Loading />
  return <SignedIn user={user} household={household} />
}

function SignedIn({ user, household }: { user: User; household: Household }) {
  const toast = useToast()
  const confetti = useConfetti()
  const { route, go, back } = useRoute()
  const recipes = useRecipes(household.id)
  const items = useItems(household.id)
  const plan = usePlan(household.id)
  const [adding, setAdding] = useState(false)
  const [shopping, setShopping] = useState(false)
  const [managingLabels, setManagingLabels] = useState(false)
  // Kept here so the chosen tab survives opening a recipe and coming back.
  const [label, setLabel] = useState(ALL)
  const activeLabel = label === ALL || household.recipeLabels.includes(label) ? label : ALL

  const tab: Tab = route.name === 'week' || route.name === 'shop' ? route.name : 'recipes'
  const invites = useInvites(user, household.id)
  const openSettings = () => go({ name: 'settings' })
  const recipe = route.name === 'recipe' ? recipes?.find(r => r.id === route.id) : undefined
  const planEntry = recipe ? plan.find(p => p.id === recipe.id) : undefined
  const unchecked = items?.filter(i => !i.checked).length ?? 0

  const toggleStaple = async (name: string, staple: boolean) => {
    if (staple) {
      await addStaple(household, name)
      toast(`⭐ ${name} is now a cupboard staple`)
    } else {
      // Remove the exact name and any broader staple that was matching it.
      await Promise.all(household.staples.filter(s => s === name || name.endsWith(' ' + s)).map(s => removeStaple(household, s)))
      toast(`${name} will go on the list`)
    }
  }

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {route.name === 'recipes' && (
          <Recipes
            key="recipes"
            recipes={recipes}
            plan={plan}
            household={household}
            label={activeLabel}
            onLabel={setLabel}
            onManageLabels={() => setManagingLabels(true)}
            onOpen={id => go({ name: 'recipe', id })}
            onAdd={() => setAdding(true)}
            onSettings={openSettings}
            settingsAlert={invites.length > 0}
          />
        )}

        {route.name === 'recipe' && (
          recipe ? (
            <RecipeDetail
              key={`recipe-${recipe.id}`}
              recipe={recipe}
              household={household}
              planEntry={planEntry}
              onBack={back}
              onEdit={() => go({ name: 'edit', id: recipe.id, draft: recipe })}
              onDelete={async () => {
                if (planEntry) await removeRecipeFromShop(household, planEntry)
                await deleteRecipe(household.id, recipe.id)
                toast('Recipe deleted')
                go({ name: 'recipes' }, true)
              }}
              onAddToShop={() => setShopping(true)}
              onToggleStaple={toggleStaple}
            />
          ) : recipes ? (
            <div key="missing" className="screen"><p>That recipe has gone.</p><button className="btn" onClick={() => go({ name: 'recipes' }, true)}>Back to recipes</button></div>
          ) : <Loading key="loading" />
        )}

        {route.name === 'edit' && (
          <RecipeEditor
            key={`edit-${route.id ?? 'new'}`}
            initial={route.draft}
            labels={household.recipeLabels}
            warning={route.warning}
            isNew={!route.id}
            onCancel={back}
            onSave={async draft => {
              if (route.id) {
                await updateRecipe(household.id, route.id, draft)
                toast('Saved ✨')
                back()
              } else {
                const id = await createRecipe(household.id, user.uid, draft)
                toast('Recipe added 🎉')
                go({ name: 'recipe', id }, true)
              }
            }}
          />
        )}

        {route.name === 'shop' && (
          <Shop
            key="shop"
            household={household}
            items={items}
            plan={plan}
            recipes={recipes}
            onOpenRecipe={id => go({ name: 'recipe', id })}
            onSettings={openSettings}
            settingsAlert={invites.length > 0}
          />
        )}

        {route.name === 'week' && (
          <Week
            key="week"
            household={household}
            plan={plan}
            recipes={recipes}
            onOpenRecipe={id => go({ name: 'recipe', id })}
            onBrowse={() => go({ name: 'recipes' })}
            onSettings={openSettings}
            settingsAlert={invites.length > 0}
          />
        )}

        {route.name === 'settings' && <Settings key="settings" user={user} household={household} invites={invites} onBack={back} />}
      </AnimatePresence>

      {route.name !== 'edit' && route.name !== 'settings' && <BottomNav tab={tab} shopCount={unchecked} weekCount={plan.filter(p => !p.cooked).length} onChange={t => t !== route.name && go({ name: t })} />}

      <AddRecipeSheet
        open={adding}
        onClose={() => setAdding(false)}
        // A recipe added while a label tab is open starts with that label.
        onDraft={(draft, warning) => go({ name: 'edit', draft: { ...draft, labels: activeLabel === ALL ? draft.labels : [activeLabel] }, warning })}
      />

      <LabelsSheet
        open={managingLabels}
        onClose={() => setManagingLabels(false)}
        household={household}
        recipes={recipes ?? []}
        onRenamed={(from, to) => setLabel(l => (l === from ? to : l))}
        onDeleted={l => setLabel(cur => (cur === l ? ALL : cur))}
      />

      {recipe && (
        <AddToShopSheet
          open={shopping}
          onClose={() => setShopping(false)}
          recipe={recipe}
          household={household}
          planEntry={planEntry}
          onConfirm={async (portions, ingredients) => {
            await addRecipeToShop(household, recipe, portions, ingredients)
            setShopping(false)
            confetti()
            toast(`🛒 ${recipe.title} added for ${portions}`)
          }}
        />
      )}
    </div>
  )
}
