/**
 * Project scope filtering utilities.
 *
 * Used to limit validation to only documents that belong to affected projects,
 * rather than re-validating all open documents on every file change.
 */

/**
 * Check whether a document filesystem path belongs to one of the affected project roots.
 * Uses `startsWith` to determine containment.
 */
export function isDocumentInAffectedProject(docFsPath: string, affectedProjectRoots: Set<string>): boolean {
  for (const projectRoot of affectedProjectRoots) {
    if (docFsPath.startsWith(projectRoot)) {
      return true;
    }
  }
  return false;
}

/**
 * Filter a list of document filesystem paths to only those that belong
 * to one of the affected project roots.
 */
export function filterDocumentsByAffectedProjects(docFsPaths: string[], affectedProjectRoots: Set<string>): string[] {
  return docFsPaths.filter(docFsPath => isDocumentInAffectedProject(docFsPath, affectedProjectRoots));
}
