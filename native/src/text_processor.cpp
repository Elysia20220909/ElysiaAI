#include "text_processor.h"
#include <algorithm>
#include <cctype>
#include <sstream>
#include <cmath>

namespace TextProcessor {

// 高速トークン化 - テキストを単語に分割
Napi::Value Tokenize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string text = info[0].As<Napi::String>();
    std::vector<std::string> tokens;
    std::stringstream ss(text);
    std::string token;

    while (ss >> token) {
        // 句読点を削除
        token.erase(std::remove_if(token.begin(), token.end(),
            [](char c) { return std::ispunct(c); }), token.end());

        if (!token.empty()) {
            // 小文字に変換
            std::transform(token.begin(), token.end(), token.begin(),
                [](unsigned char c) { return std::tolower(c); });
            tokens.push_back(token);
        }
    }

    Napi::Array result = Napi::Array::New(env, tokens.size());
    for (size_t i = 0; i < tokens.size(); i++) {
        result[i] = Napi::String::New(env, tokens[i]);
    }

    return result;
}

// コサイン類似度 - 2つのベクトル間の類似度（埋め込み比較用）
Napi::Value CosineSimilarity(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsArray() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "Two arrays expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Array vec1 = info[0].As<Napi::Array>();
    Napi::Array vec2 = info[1].As<Napi::Array>();

    if (vec1.Length() != vec2.Length()) {
        Napi::TypeError::New(env, "Vectors must have same length").ThrowAsJavaScriptException();
        return env.Null();
    }

    double dotProduct = 0.0;
    double mag1 = 0.0;
    double mag2 = 0.0;

    for (uint32_t i = 0; i < vec1.Length(); i++) {
        double a = vec1.Get(i).As<Napi::Number>().DoubleValue();
        double b = vec2.Get(i).As<Napi::Number>().DoubleValue();

        dotProduct += a * b;
        mag1 += a * a;
        mag2 += b * b;
    }

    if (mag1 == 0.0 || mag2 == 0.0) {
        return Napi::Number::New(env, 0.0);
    }

    double similarity = dotProduct / (std::sqrt(mag1) * std::sqrt(mag2));
    return Napi::Number::New(env, similarity);
}

// テキスト正規化
Napi::Value Normalize(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string text = info[0].As<Napi::String>();

    // 空白をトリム
    text.erase(0, text.find_first_not_of(" \t\n\r"));
    text.erase(text.find_last_not_of(" \t\n\r") + 1);

    // 小文字に変換
    std::transform(text.begin(), text.end(), text.begin(),
        [](unsigned char c) { return std::tolower(c); });

    // 複数の空白を1つに圧縮
    auto newEnd = std::unique(text.begin(), text.end(),
        [](char a, char b) { return std::isspace(a) && std::isspace(b); });
    text.erase(newEnd, text.end());

    return Napi::String::New(env, text);
}

}  // namespace TextProcessor
