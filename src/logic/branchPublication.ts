export const referenceMutation = 'mutation PublishReviewedBranch($input: UpdateRefsInput!) { updateRefs(input: $input) { clientMutationId } }';
export class ReferenceRejected extends Error {}
export type ReferenceReply = { data?: { updateRefs?: { clientMutationId?: string | null } | null } | null; errors?: { type?: string; message?: string; extensions?: { code?: string } }[] };
export function referenceInput(repositoryId: string, branch: string, before: string, after: string) {
  if (!repositoryId || !branch || [before, after].some((oid) => !/^[a-f0-9]{40}$/.test(oid) || /^0+$/.test(oid))) throw new Error('Invalid existing-branch publication target.');
  return { repositoryId, clientMutationId: after, refUpdates: [{ name: `refs/heads/${branch}`, beforeOid: before, afterOid: after, force: false }] };
}
export function assertReferenceReply(reply: ReferenceReply, mutationId: string) {
  if (!reply.errors?.length && reply.data?.updateRefs?.clientMutationId === mutationId) return;
  const rejected = new Set(['FORBIDDEN', 'UNPROCESSABLE', 'NOT_FOUND', 'INSUFFICIENT_SCOPES', 'GRAPHQL_VALIDATION_FAILED', 'RATE_LIMITED']);
  if (reply.errors?.length && !reply.data?.updateRefs && reply.errors.every((error) => rejected.has(error.type || error.extensions?.code || ''))) throw new ReferenceRejected(`GitHub rejected this branch update: ${reply.errors.map((error) => error.message || error.type || 'Rejected').join('; ')}. Refresh the branch and rebuild the preview. Repository rules are not bypassed.`);
  throw new Error('UNKNOWN_PUBLICATION: GitHub did not return an unambiguous branch-update acknowledgement. Check the publication result before retrying.');
}
