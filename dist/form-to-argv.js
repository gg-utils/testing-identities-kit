import { omitUndefined } from "./omit-undefined.js";
/** Maps aggregated UI fields into the argv input union consumed by argv builders. */
export function TestingIdentitiesKit_formFieldsToArgvInput(options) {
    const formFields = options.fields;
    switch (options.workflowId) {
        case "allocate":
            return omitUndefined({
                workflow: "allocate",
                purpose: formFields.allocatePurpose.trim() || undefined,
                runId: formFields.allocateRunId.trim() || undefined,
            });
        case "ensureAuth":
            return omitUndefined({
                workflow: "ensureAuth",
                email: formFields.ensureEmail.trim(),
                password: formFields.ensurePassword.trim() || undefined,
                userName: formFields.ensureUserName.trim() || undefined,
                websiteUrl: formFields.ensureWebsiteUrl.trim() || undefined,
                allowRealEmail: formFields.ensureAllowReal,
            });
        case "ensureApplicant":
            return omitUndefined({
                workflow: "ensureApplicant",
                email: formFields.ensureEmail.trim(),
                actorUserToken: formFields.applicantActorToken.trim() || undefined,
                source: formFields.applicantSource.trim() || undefined,
                apiUrl: formFields.applicantApiUrl.trim() || undefined,
                password: formFields.applicantPassword.trim() || undefined,
                userName: formFields.applicantUserName.trim() || undefined,
                allowRealEmail: formFields.applicantAllowReal,
            });
        case "fixtureHygiene":
            return omitUndefined({
                workflow: "fixtureHygiene",
                strict: formFields.fixtureStrict,
            });
    }
}
/** Validates that email-backed workflows include a non-empty email before launch. */
export function TestingIdentitiesKit_validateEmailWorkflow(options) {
    if ((options.workflowId === "ensureAuth" ||
        options.workflowId === "ensureApplicant") &&
        options.email.trim().length === 0) {
        return "--email is required for this workflow.";
    }
    return null;
}
//# sourceMappingURL=form-to-argv.js.map