#include <napi.h>
#include "text_processor.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("tokenize", Napi::Function::New(env, TextProcessor::Tokenize));
    exports.Set("similarity", Napi::Function::New(env, TextProcessor::CosineSimilarity));
    exports.Set("normalize", Napi::Function::New(env, TextProcessor::Normalize));
    return exports;
}

NODE_API_MODULE(elysia_native, Init)
