export const meta = {
  name: 'model-test',
  description: 'Quick test: verify agent() model override works with GLM-5.1',
  phases: [
    { title: 'test', detail: 'Call agent with model: glm-5.1' },
  ],
}

phase('test')

const result = await agent('用一句话回答：1+1等于几？只输出数字。', {
  label: 'math-glm',
  model: 'glm-5.1',
})

log('Agent result: ' + JSON.stringify(result))

return { model: 'glm-5.1', result }
