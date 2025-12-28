#include <napi.h>
#include <vector>
#include <string>
#include <sstream>
#include "text_processor.h"

// Native function: normalize text
Napi::String Normalize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string input = info[0].As<Napi::String>();

  // Delegate to implementation in text_processor.cpp
  Napi::Value result = TextProcessor::Normalize(info);
  return result.As<Napi::String>();
}

// Native function: tokenize
Napi::Array Tokenize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return Napi::Array::New(env);
  }

  std::string input = info[0].As<Napi::String>();

  // Use existing implementation in text_processor.cpp
  Napi::Value result = TextProcessor::Tokenize(info);
  return result.As<Napi::Array>();
}

// Native function: word count
Napi::Number WordCount(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
    return Napi::Number::New(env, 0);
  }

  std::string input = info[0].As<Napi::String>();

  std::istringstream iss(input);
  size_t count = 0;
  std::string word;
  while (iss >> word) {
    ++count;
  }

  return Napi::Number::New(env, count);
}

// Native function: get library info
Napi::Object LibraryInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Object obj = Napi::Object::New(env);

  obj.Set("name", "elysia-native");
  obj.Set("version", "1.0.0");

#if defined(_WIN32)
  obj.Set("os", "windows");
#elif defined(__APPLE__)
  obj.Set("os", "macos");
#elif defined(__linux__)
  obj.Set("os", "linux");
#else
  obj.Set("os", "unknown");
#endif

#if defined(_M_X64) || defined(__x86_64__)
  obj.Set("arch", "x64");
#elif defined(__aarch64__)
  obj.Set("arch", "arm64");
#elif defined(__arm__)
  obj.Set("arch", "arm");
#else
  obj.Set("arch", "unknown");
#endif

  return obj;
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(
    Napi::String::New(env, "normalize"),
    Napi::Function::New(env, Normalize)
  );

  exports.Set(
    Napi::String::New(env, "tokenize"),
    Napi::Function::New(env, Tokenize)
  );

  exports.Set(
    Napi::String::New(env, "wordCount"),
    Napi::Function::New(env, WordCount)
  );

  exports.Set(
    Napi::String::New(env, "libraryInfo"),
    Napi::Function::New(env, LibraryInfo)
  );

  return exports;
}

NODE_API_MODULE(elysia_native, Init)
