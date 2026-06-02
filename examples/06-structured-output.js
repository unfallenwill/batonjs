/**
 * Example 06: Structured Output with Schema
 * Level: Beginner
 *
 * Demonstrates how to use the `schema` option to force
 * an agent to return validated JSON instead of free text.
 *
 * Key takeaway: When you pass a JSON Schema to agent(),
 * the subagent must call a StructuredOutput tool that conforms
 * to the schema. agent() returns the validated object directly
 * — no parsing needed on your end.
 */

export const meta = {
  name: 'structured-output',
  description: 'Shows how schema forces validated JSON output',
  phases: [{ title: 'Generate', detail: 'generate a structured recipe' }],
}

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Recipe name' },
    servings: { type: 'number', description: 'Number of servings' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          amount: { type: 'string' },
        },
        required: ['item', 'amount'],
      },
    },
    steps: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['name', 'servings', 'ingredients', 'steps'],
}

phase('Generate')

const recipe = await agent(
  'Create a simple pasta recipe.',
  { label: 'recipe-generator', schema: RECIPE_SCHEMA }
)

log(`Recipe: ${recipe.name} (${recipe.servings} servings)`)
log(`Ingredients: ${recipe.ingredients.length} items`)
log(`Steps: ${recipe.steps.length} steps`)

return recipe
