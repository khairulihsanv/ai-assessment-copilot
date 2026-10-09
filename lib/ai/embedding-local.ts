/**
 * Local embedding using Transformers.js with Xenova/multilingual-e5-base.
 * We use the singleton pattern to load the model only once.
 */
import { embeddingConfig } from "@/lib/config/rag-config";

class EmbeddingPipeline {
  static task = "feature-extraction" as const;
  static instance: Promise<any> | null = null;

  static async getInstance() {
    if (this.instance === null) {
      const config = embeddingConfig();
      if (config.kind !== "local") {
        throw new Error("EmbeddingProvider is not set to 'local' in config");
      }
      try {
        const importDynamic = new Function('modulePath', 'return import(modulePath)');
        const { pipeline } = await importDynamic("@huggingface/transformers");
        this.instance = pipeline(this.task, config.model, {
          // Specify quantized model to reduce memory footprint
          dtype: "q8",
        } as any);
      } catch (err) {
        throw new Error("Paket @huggingface/transformers tidak tersedia atau gagal dimuat: " + (err instanceof Error ? err.message : String(err)));
      }
    }
    return this.instance;
  }
}

export async function generateEmbeddingLocal(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  
  // Multilingual-e5 requires "query: " or "passage: " prefixes.
  // We generally embed documents with "passage: " prefix and search queries with "query: ".
  // This low-level function doesn't know the context, so we expect the prefix to be applied before calling.
  // BUT to be safe, if we get raw text without prefix, we'll assume it's a passage by default for indexing,
  // except we should enforce prefixing at the caller level.
  
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function generateEmbeddingsLocal(texts: string[]): Promise<number[][]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const results: number[][] = [];
  
  // Transformers.js pipeline can take an array, but we might want to batch it ourselves to avoid OOM
  const config = embeddingConfig();
  const batchSize = config.batchSize;
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    // Setting normalize: true is important for cosine similarity to just be dot product
    const output = await extractor(batch, { pooling: "mean", normalize: true });
    
    // Output is a Tensor. If we passed N texts, shape is [N, dimensions]
    const batchResults = output.tolist() as number[][];
    results.push(...batchResults);
  }
  
  return results;
}
