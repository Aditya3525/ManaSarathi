process.env.OLLAMA_ENABLED = 'true';
process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
process.env.OLLAMA_MODEL = 'gpt-oss:20b-cloud';
process.env.AI_PROVIDER_PRIORITY = 'ollama,gemini,gemini';

(async () => {
  try {
    const svc = require('../dist/services/assessmentInsightsService');
    if (!svc || !svc.buildAssessmentInsights) {
      console.error('buildAssessmentInsights not found in dist build');
      process.exit(1);
    }

    const assessments = [
      {
        id: 'test-1',
        assessmentType: 'anxiety',
        score: 6,
        completedAt: new Date(),
        responses: JSON.stringify([])
      },
      {
        id: 'test-2',
        assessmentType: 'anxiety',
        score: 8,
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        responses: JSON.stringify([])
      }
    ];

    console.log('Calling buildAssessmentInsights with sample assessments...');
    const result = await svc.buildAssessmentInsights(assessments, { userName: 'Integration Test' });
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Test failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
