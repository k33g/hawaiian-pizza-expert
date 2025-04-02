variable "REPO" {
  default = "k33g"
}

variable "TAG" {
  default = "experimental"
}

variable "GO_VERSION" {
  default = "1.24.0"
}

variable "USER_NAME" {
  default = "openvscode-server"
}
group "default" {
  targets = ["genai-ide"]
}

target "genai-ide" {
  context = "."
  dockerfile = "Dockerfile"
  args = {
    GO_VERSION = GO_VERSION
    USER_NAME = USER_NAME
  }
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
  tags = ["${REPO}/genai-ide:${TAG}"]
}

# docker buildx bake --push
# docker buildx bake