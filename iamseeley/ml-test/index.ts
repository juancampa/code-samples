import { state } from "membrane";

type DataPoint = [number, number];
type ModelParams = { slope: number; intercept: number; xMean: number; xStd: number; yMean: number; yStd: number };
type Hyperparameters = { learningRate: number; epochs: number };
type TrainingProgress = { currentEpoch: number; loss: number[] };

state.trainingData = (state.trainingData ?? []) as DataPoint[];
state.modelParams = (state.modelParams ?? { slope: 0, intercept: 0, xMean: 0, xStd: 1, yMean: 0, yStd: 1 }) as ModelParams;
state.hyperparameters = { learningRate: 0.01, epochs: 1000 };
state.trainingProgress = (state.trainingProgress ?? { currentEpoch: 0, loss: [] }) as TrainingProgress;

function normalizeData(data: DataPoint[]): [DataPoint[], number, number, number, number] {
  const xValues = data.map(([x, ]) => x);
  const yValues = data.map(([, y]) => y);
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
  const xStd = Math.sqrt(xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0) / xValues.length) || 1;
  const yStd = Math.sqrt(yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0) / yValues.length) || 1;

  const normalizedData: DataPoint[] = data.map(([x, y]) => [(x - xMean) / xStd, (y - yMean) / yStd]);
  return [normalizedData, xMean, xStd, yMean, yStd];
}

export async function addTrainingData(newData: DataPoint[]): Promise<void> {
  state.trainingData.push(...newData);
  console.log("New data added. Total training samples:", state.trainingData.length);
}

function predict(x: number): number {
  const normalizedX = (x - state.modelParams.xMean) / state.modelParams.xStd;
  const normalizedY = state.modelParams.slope * normalizedX + state.modelParams.intercept;
  return normalizedY * state.modelParams.yStd + state.modelParams.yMean;
}

function computeLoss(data: DataPoint[]): number {
  return data.reduce((sum, [x, y]) => {
    const pred = predict(x);
    return sum + Math.pow(pred - y, 2);
  }, 0) / data.length;
}

export async function trainModel(): Promise<void> {
  const { learningRate, epochs } = state.hyperparameters;
  let { currentEpoch } = state.trainingProgress;

  const [normalizedData, xMean, xStd, yMean, yStd] = normalizeData(state.trainingData);
  state.modelParams.xMean = xMean;
  state.modelParams.xStd = xStd;
  state.modelParams.yMean = yMean;
  state.modelParams.yStd = yStd;

  console.log("Normalized data stats:", { xMean, xStd, yMean, yStd });

  for (let epoch = currentEpoch; epoch < epochs; epoch++) {
    let totalGradientSlope = 0;
    let totalGradientIntercept = 0;

    for (const [x, y] of normalizedData) {
      const prediction = state.modelParams.slope * x + state.modelParams.intercept;
      const error = prediction - y;
      totalGradientSlope += error * x;
      totalGradientIntercept += error;
    }

    const avgGradientSlope = totalGradientSlope / normalizedData.length;
    const avgGradientIntercept = totalGradientIntercept / normalizedData.length;

    state.modelParams.slope -= learningRate * avgGradientSlope;
    state.modelParams.intercept -= learningRate * avgGradientIntercept;

    if (epoch % 100 === 0 || epoch === epochs - 1) {
      const loss = computeLoss(state.trainingData);
      state.trainingProgress.loss.push(loss);
      state.trainingProgress.currentEpoch = epoch + 1;
      console.log(`Epoch ${epoch + 1}/${epochs} completed. Loss: ${loss}`);
      console.log(`Current parameters: slope=${state.modelParams.slope}, intercept=${state.modelParams.intercept}`);
    }
  }

  console.log("Training completed. Final parameters:", state.modelParams);
}

export async function evaluateModel(testData: DataPoint[]): Promise<{ mse: number; rmse: number; rSquared: number }> {
  console.log("Evaluating model...");

  const mse = computeLoss(testData);
  const rmse = Math.sqrt(mse);
  
  const yMean = testData.reduce((sum, [, y]) => sum + y, 0) / testData.length;
  const totalSS = testData.reduce((sum, [, y]) => sum + Math.pow(y - yMean, 2), 0);
  const residualSS = testData.reduce((sum, [x, y]) => sum + Math.pow(y - predict(x), 2), 0);
  const rSquared = 1 - (residualSS / totalSS);

  const metrics = { mse, rmse, rSquared };
  console.log("Evaluation completed. Metrics:", metrics);

  return metrics;
}

export async function makePredictions(inputs: number[]): Promise<number[]> {
  return inputs.map(x => predict(x));
}

export async function getModelState(): Promise<{
  modelParams: ModelParams;
  hyperparameters: Hyperparameters;
  trainingProgress: TrainingProgress;
  datasetSize: number;
}> {
  return {
    modelParams: state.modelParams,
    hyperparameters: state.hyperparameters,
    trainingProgress: state.trainingProgress,
    datasetSize: state.trainingData.length
  };
}

export async function runExample(): Promise<string> {
  function generateExampleData(numSamples: number = 50): DataPoint[] {
    const data: DataPoint[] = [];
    for (let i = 0; i < numSamples; i++) {
      const hoursStudied = Math.random() * 10;
      const examScore = 50 + (5 * hoursStudied) + (Math.random() - 0.5) * 10;
      data.push([hoursStudied, examScore]);
    }
    return data;
  }

  console.log("Generating example data...");
  const trainingData = generateExampleData(1000);
  const testData = generateExampleData(200);

  console.log("Adding training data...");
  await addTrainingData(trainingData);

  console.log("Training model...");
  await trainModel();

  console.log("Evaluating model...");
  const evaluationMetrics = await evaluateModel(testData);
  console.log("Evaluation Metrics:", evaluationMetrics);

  console.log("Making predictions...");
  const newDataPoints = [2, 5, 8];
  const predictions = await makePredictions(newDataPoints);
  console.log("Predictions for 2, 5, and 8 hours of studying:", predictions);

  console.log("Getting model state...");
  const modelState = await getModelState();
  console.log("Model State:", modelState);

  return "Example completed successfully!";
}



// We use membrane's state object to persistently store the model's data, parameters, and training progress.
// Typically you'd use in-memory variables or a separate database to store this information. But, because this program is a database we don't have to!
// All of the functions are durable. they can be invoked independently and maintain state between invocations.


// The initial goal was to understand how Membrane's features could be applied to a data-intensive, stateful application like a machine learning model.

// Thinking about:

// How Membrane's state management compares to traditional approaches in handling ML workflows.
// The ease of creating a full-fledged ML service, from data ingestion to model training and prediction.
// The potential advantages of Membrane for iterative, long-running computations like model training.
// How Membrane's architecture could simplify the deployment and scaling of ML models.