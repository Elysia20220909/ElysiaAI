#include <cuda_runtime.h>
#include <device_launch_parameters.h>
#include <stdio.h>
#include <math.h>

// CUDA kernel for cosine similarity batch computation
__global__ void cosineSimilarityKernel(
    const float* queries, 
    const float* database, 
    float* results,
    int numQueries,
    int numVectors,
    int dimension
) {
    int queryIdx = blockIdx.x * blockDim.x + threadIdx.x;
    int vectorIdx = blockIdx.y * blockDim.y + threadIdx.y;
    
    if (queryIdx >= numQueries || vectorIdx >= numVectors) return;
    
    float dotProduct = 0.0f;
    float queryMag = 0.0f;
    float vectorMag = 0.0f;
    
    for (int i = 0; i < dimension; i++) {
        float q = queries[queryIdx * dimension + i];
        float v = database[vectorIdx * dimension + i];
        
        dotProduct += q * v;
        queryMag += q * q;
        vectorMag += v * v;
    }
    
    float similarity = 0.0f;
    if (queryMag > 0.0f && vectorMag > 0.0f) {
        similarity = dotProduct / (sqrtf(queryMag) * sqrtf(vectorMag));
    }
    
    results[queryIdx * numVectors + vectorIdx] = similarity;
}

// CUDA kernel for vector normalization
__global__ void normalizeKernel(float* vectors, int numVectors, int dimension) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    
    if (idx >= numVectors) return;
    
    float magnitude = 0.0f;
    for (int i = 0; i < dimension; i++) {
        float val = vectors[idx * dimension + i];
        magnitude += val * val;
    }
    
    magnitude = sqrtf(magnitude);
    
    if (magnitude > 0.0f) {
        for (int i = 0; i < dimension; i++) {
            vectors[idx * dimension + i] /= magnitude;
        }
    }
}

// Host function to compute similarities on GPU
extern "C" {
    int cudaComputeSimilarities(
        const float* h_queries,
        const float* h_database,
        float* h_results,
        int numQueries,
        int numVectors,
        int dimension
    ) {
        // Device memory pointers
        float *d_queries, *d_database, *d_results;
        
        size_t querySize = numQueries * dimension * sizeof(float);
        size_t dbSize = numVectors * dimension * sizeof(float);
        size_t resultSize = numQueries * numVectors * sizeof(float);
        
        // Allocate device memory
        cudaMalloc(&d_queries, querySize);
        cudaMalloc(&d_database, dbSize);
        cudaMalloc(&d_results, resultSize);
        
        // Copy data to device
        cudaMemcpy(d_queries, h_queries, querySize, cudaMemcpyHostToDevice);
        cudaMemcpy(d_database, h_database, dbSize, cudaMemcpyHostToDevice);
        
        // Launch kernel
        dim3 blockSize(16, 16);
        dim3 gridSize(
            (numQueries + blockSize.x - 1) / blockSize.x,
            (numVectors + blockSize.y - 1) / blockSize.y
        );
        
        cosineSimilarityKernel<<<gridSize, blockSize>>>(
            d_queries, d_database, d_results,
            numQueries, numVectors, dimension
        );
        
        // Copy results back
        cudaMemcpy(h_results, d_results, resultSize, cudaMemcpyDeviceToHost);
        
        // Free device memory
        cudaFree(d_queries);
        cudaFree(d_database);
        cudaFree(d_results);
        
        // Check for errors
        cudaError_t error = cudaGetLastError();
        if (error != cudaSuccess) {
            fprintf(stderr, "CUDA error: %s\n", cudaGetErrorString(error));
            return -1;
        }
        
        return 0;
    }
}
