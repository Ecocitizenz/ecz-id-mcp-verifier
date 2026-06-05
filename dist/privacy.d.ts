export declare const PRIVACY: {
    readonly no_source_upload: true;
    readonly no_secrets_upload: true;
    readonly no_telemetry: true;
    readonly local_policy_decides: true;
    readonly recheck_before_reliance: true;
    readonly no_safety_or_approval_inference: true;
};
export type PrivacyInvariants = typeof PRIVACY;
export declare const OUTPUT_PRIVACY_FIELDS: {
    readonly local_policy_decides: true;
    readonly recheck_before_reliance: true;
    readonly no_safety_or_approval_inference: true;
    readonly no_source_uploaded: true;
    readonly no_secrets_uploaded: true;
    readonly no_telemetry: true;
};
