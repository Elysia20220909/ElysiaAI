{
  "targets": [
    {
      "target_name": "elysia_native",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [ "src/main.cpp", "src/text_processor.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [ "/std:c++17" ]
        }
      },
      "conditions": [
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.15",
            "ARCHS": ["x86_64", "arm64"],
            "GCC_OPTIMIZATION_LEVEL": "3"
          }
        }],
        ["OS=='win'", {
          "defines": [ "WIN32" ],
          "configurations": {
            "Release": {
              "msvs_settings": {
                "VCCLCompilerTool": {
                  "Optimization": 2,
                  "InlineFunctionExpansion": 2,
                  "EnableIntrinsicFunctions": "true",
                  "FavorSizeOrSpeed": 1
                }
              }
            }
          }
        }],
        ["OS=='linux'", {
          "cflags_cc": [
            "-std=c++17",
            "-fexceptions",
            "-O3"
          ]
        }]
      ]
    }
  ]
}
