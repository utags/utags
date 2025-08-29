/**
 * @fileoverview Utility function for building standardized sync file paths.
 */

/**
 * Builds a standardized file path for synchronization based on the target path and scope.
 *
 * @example
 * // For a target path of '/path/to/dir/' and scope 'all':
 * buildSyncPath('/path/to/dir/', 'all'); // Returns 'path/to/dir/utags-bookmarks.json'
 *
 * @example
 * // For a target path of '/path/to/dir/' and scope '12345':
 * buildSyncPath('/path/to/dir/', '12345'); // Returns 'path/to/dir/utags-collection-12345.json'
 * @example
 * // For a target path of '/' and scope 'all':
 * buildSyncPath('/', 'all'); // Returns 'utags-bookmarks.json'
 *
 * @example
 * // For a target path of '/' and scope '12345':
 * buildSyncPath('/', '12345'); // Returns 'utags-collection-12345.json'
 *
 * @example
 * // For a target path of '' and scope 'all':
 * buildSyncPath('', 'all'); // Returns 'utags-bookmarks.json'
 *
 * @example
 * // For a target path of '' and scope '12345':
 * buildSyncPath('', '12345'); // Returns 'utags-collection-12345.json'
 *
 * @example
 * // For a target path of '/path/to/filename' and scope 'all':
 * buildSyncPath('/path/to/filename', 'all'); // Returns 'path/to/filename.json'
 *
 * @example
 * // For a target path of '/path/to/filename' and scope '12345':
 * buildSyncPath('/path/to/filename', '12345'); // Returns 'path/to/filename.json'
 * @example
 * // For a target path of 'filename' and scope 'all':
 * buildSyncPath('filename', 'all'); // Returns 'filename.json'
 *
 * @example
 * // For a target path of 'filename' and scope '12345':
 * buildSyncPath('filename', '12345'); // Returns 'filename.json'
 *
 * @example
 * // For a target path of 'filename.data' and scope 'all':
 * buildSyncPath('filename.data', 'all'); // Returns 'filename.data.json'
 *
 * @example
 * // For a target path of 'filename.data' and scope '12345':
 * buildSyncPath('filename.data', '12345'); // Returns 'filename.data.json'
 *
 * @param rawTargetPath The raw target path string. This can be a full path with a filename,
 *                      a directory path ending with a slash, or just a filename.
 * @param scope The synchronization scope. Can be 'all' or a specific collection ID.
 * @param prefix The prefix used for constructing default filenames.
 *               For example, if scope is 'all', the default filename becomes '${prefix}-bookmarks'.
 *               If scope is a collection ID, it becomes '${prefix}-collection-{collectionId}'.
 *               Defaults to 'utags'.
 * @returns The constructed file path, ensuring it ends with '.json'.
 */
export function buildSyncPath(
  rawTargetPath: string | undefined,
  scope: string | undefined,
  prefix = 'utags'
): string {
  const trimmedPath = (rawTargetPath || '').trim()
  const trimmedScope = (scope || '').trim()
  const pathParts = trimmedPath.replace(/\.json$/i, '').split('/')
  const fileNameWithoutExtension =
    pathParts.pop()!.trim() ||
    (trimmedScope && trimmedScope !== 'all'
      ? `${prefix}-collection-${trimmedScope}`
      : `${prefix}-bookmarks`)
  const dir = pathParts
    .map((v) => v.trim())
    .filter(Boolean)
    .join('/')

  return dir
    ? `${dir}/${fileNameWithoutExtension}.json`
    : `${fileNameWithoutExtension}.json`
}
