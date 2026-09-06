import { register } from "node:module";
import { pathToFileURL } from "node:url";

/**
 * The app's source uses extensionless relative imports ("./env"), which the
 * bundler resolves but Node's ESM loader does not. This hook appends the .ts
 * extension so the tests can import the real source with no build step, using
 * Node's native type stripping.
 */
const source = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".")) {
    try {
      return await nextResolve(specifier, context);
    } catch (error) {
      // A directory import ("./reference") raises a different code than a
      // missing file, and both mean "try the .ts candidates".
      const retryable = ["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"];
      if (!retryable.includes(error?.code)) throw error;
      for (const candidate of [specifier + ".ts", specifier + "/index.ts"]) {
        try {
          return await nextResolve(candidate, context);
        } catch {
          // Try the next candidate.
        }
      }
      throw error;
    }
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(source)}`, pathToFileURL("./"));
