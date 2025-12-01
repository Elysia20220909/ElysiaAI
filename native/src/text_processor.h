#pragma once
#include <napi.h>
#include <string>
#include <vector>

namespace TextProcessor {
    // Fast tokenization using C++
    Napi::Value Tokenize(const Napi::CallbackInfo& info);
    
    // Cosine similarity for vector comparison (RAG optimization)
    Napi::Value CosineSimilarity(const Napi::CallbackInfo& info);
    
    // Text normalization (lowercase, trim, etc.)
    Napi::Value Normalize(const Napi::CallbackInfo& info);
}
