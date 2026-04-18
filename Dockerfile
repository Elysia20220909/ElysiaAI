FROM rust:slim
RUN apt-get update && \
    apt-get install -y clang lld nasm make mtools dosfstools qemu-utils xorriso && \
    rm -rf /var/lib/apt/lists/*
RUN rustup target add x86_64-pc-windows-gnullvm
WORKDIR /os
CMD ["make"]
