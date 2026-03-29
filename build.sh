#!/usr/bin/env bash
set -euo pipefail
appname="contexo"
start_time=$(date +%s%N)
SCRIPTDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
output_dir="/usr/local/bin"
build_target=""
has_output_dir="false"

while (($# > 0)); do
  case "$1" in
    --target)
      if (($# < 2)); then
        echo "Missing value for --target" >&2
        exit 1
      fi
      if [[ -z "$2" ]]; then
        echo "Missing value for --target" >&2
        exit 1
      fi
      build_target="$2"
      shift 2
      ;;
    --target=*)
      build_target="${1#--target=}"
      if [[ -z "$build_target" ]]; then
        echo "Missing value for --target" >&2
        exit 1
      fi
      shift
      ;;
    --*)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
    *)
      if [[ "$has_output_dir" == "true" ]]; then
        echo "Too many positional arguments: $1" >&2
        exit 1
      fi
      output_dir="$1"
      has_output_dir="true"
      shift
      ;;
  esac
done

mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" >/dev/null 2>&1 && pwd)"
echo " ${output_dir}" >&2
built_tmp_path="${SCRIPTDIR}/${appname}"
built_path="${output_dir}/${appname}"
build_args=()

if [[ -n "$build_target" ]]; then
  build_args+=(--target "$build_target")
fi

(
  cd "$SCRIPTDIR"
  bun install
  rm -f "$built_tmp_path"
  bun run build/bunbuild.ts -- "${build_args[@]}"
)

if [[ "$built_tmp_path" != "$built_path" ]]; then
  install -m 755 "$built_tmp_path" "$built_path"
  rm -f "$built_tmp_path"
else
  chmod 755 "$built_path"
fi

echo "╰► ${built_path}" >&2
echo " Build in $(( ($(date +%s%N) - start_time) / 1000000 ))ms"
