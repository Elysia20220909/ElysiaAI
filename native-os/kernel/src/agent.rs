//! Agent proposals are checked above the deterministic authority kernel.

pub const MAX_AGENT_MEMORY_PAGES: u16 = 16;
pub const MAX_AGENT_CPU_TICKS: u32 = 1024;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum ResourceKind {
    Cpu,
    Memory,
    Storage,
    Network,
    Gpu,
    Npu,
    Fpga,
    CxlMemory,
    Qpu,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ResourceBudget {
    pub memory_pages: u16,
    pub cpu_ticks: u32,
    pub network_bytes: u32,
    pub storage_bytes: u32,
}

impl ResourceBudget {
    pub const ZERO: Self = Self {
        memory_pages: 0,
        cpu_ticks: 0,
        network_bytes: 0,
        storage_bytes: 0,
    };
    pub const INFERENCE: Self = Self {
        memory_pages: MAX_AGENT_MEMORY_PAGES,
        cpu_ticks: MAX_AGENT_CPU_TICKS,
        network_bytes: 0,
        storage_bytes: 0,
    };

    pub fn within(self, ceiling: Self) -> bool {
        self.memory_pages <= ceiling.memory_pages
            && self.cpu_ticks <= ceiling.cpu_ticks
            && self.network_bytes <= ceiling.network_bytes
            && self.storage_bytes <= ceiling.storage_bytes
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ContextSet(pub u64);
impl ContextSet {
    pub const NONE: Self = Self(0);
    pub fn is_subset_of(self, allowed: Self) -> bool {
        self.0 & !allowed.0 == 0
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ToolSet(pub u64);
impl ToolSet {
    pub const NONE: Self = Self(0);
    pub fn is_subset_of(self, allowed: Self) -> bool {
        self.0 & !allowed.0 == 0
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AuthoritySet(pub u64);
impl AuthoritySet {
    pub const NONE: Self = Self(0);
    pub fn is_subset_of(self, ceiling: Self) -> bool {
        self.0 & !ceiling.0 == 0
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApprovalPolicy {
    Never,
    RequiredForMutation,
    Always,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RecoveryPolicy {
    ReclaimAll,
    RestartWithManifest,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AgentManifest {
    pub agent_id: u64,
    pub goal_digest: [u8; 32],
    pub context: ContextSet,
    pub authority: AuthoritySet,
    pub memory_pages: u16,
    pub cpu_ticks: u32,
    pub network_bytes: u32,
    pub tools: ToolSet,
    pub approval: ApprovalPolicy,
    pub recovery: RecoveryPolicy,
}

impl AgentManifest {
    pub fn validate(self, ceiling: &AgentManifest) -> Result<Self, DenyReason> {
        if self.agent_id != ceiling.agent_id {
            return Err(DenyReason::AgentIdentity);
        }
        if self.goal_digest != ceiling.goal_digest {
            return Err(DenyReason::GoalChanged);
        }
        if !self.context.is_subset_of(ceiling.context) {
            return Err(DenyReason::ContextExceeded);
        }
        if !self.authority.is_subset_of(ceiling.authority) {
            return Err(DenyReason::AuthorityExceeded);
        }
        if !self.tools.is_subset_of(ceiling.tools) {
            return Err(DenyReason::ToolsExceeded);
        }
        let budget = ResourceBudget {
            memory_pages: self.memory_pages,
            cpu_ticks: self.cpu_ticks,
            network_bytes: self.network_bytes,
            storage_bytes: 0,
        };
        let limit = ResourceBudget {
            memory_pages: ceiling.memory_pages,
            cpu_ticks: ceiling.cpu_ticks,
            network_bytes: ceiling.network_bytes,
            storage_bytes: 0,
        };
        if !budget.within(limit) {
            return Err(DenyReason::ResourceExceeded);
        }
        if self.approval != ceiling.approval || self.recovery != ceiling.recovery {
            return Err(DenyReason::PolicyChanged);
        }
        Ok(self)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AgentProposal {
    pub agent_id: u64,
    pub goal_digest: [u8; 32],
    pub requested_context: ContextSet,
    pub requested_authority: AuthoritySet,
    pub requested_tools: ToolSet,
    pub requested_budget: ResourceBudget,
    pub mutates_state: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DenyReason {
    AgentIdentity,
    GoalChanged,
    ContextExceeded,
    AuthorityExceeded,
    ToolsExceeded,
    ResourceExceeded,
    PolicyChanged,
    ApprovalMissing,
    UnsupportedResource,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyDecision {
    Allow,
    Deny(DenyReason),
    NeedsApproval,
}

impl AgentProposal {
    pub fn decide(self, manifest: &AgentManifest, ceiling: &AgentManifest) -> PolicyDecision {
        if let Err(reason) = manifest.validate(ceiling) {
            return PolicyDecision::Deny(reason);
        }
        // No storage or network backend exists at this boundary yet.
        if self.requested_budget.storage_bytes != 0 || self.requested_budget.network_bytes != 0 {
            return PolicyDecision::Deny(DenyReason::UnsupportedResource);
        }
        if self.agent_id != manifest.agent_id {
            return PolicyDecision::Deny(DenyReason::AgentIdentity);
        }
        if self.goal_digest != manifest.goal_digest {
            return PolicyDecision::Deny(DenyReason::GoalChanged);
        }
        let proposed = AgentManifest {
            agent_id: self.agent_id,
            goal_digest: self.goal_digest,
            context: self.requested_context,
            authority: self.requested_authority,
            memory_pages: self.requested_budget.memory_pages,
            cpu_ticks: self.requested_budget.cpu_ticks,
            network_bytes: self.requested_budget.network_bytes,
            tools: self.requested_tools,
            approval: manifest.approval,
            recovery: manifest.recovery,
        };
        if let Err(reason) = proposed.validate(manifest) {
            return PolicyDecision::Deny(reason);
        }
        if manifest.approval == ApprovalPolicy::Always
            || (self.mutates_state && manifest.approval == ApprovalPolicy::RequiredForMutation)
        {
            PolicyDecision::NeedsApproval
        } else {
            PolicyDecision::Allow
        }
    }
}

pub fn resource_supported(kind: ResourceKind) -> bool {
    matches!(kind, ResourceKind::Cpu | ResourceKind::Memory)
}

/// Trusted, fixed identity for the embedded inference ELF, not an LLM-generated manifest.
/// The goal bytes are a versioned fixture identifier, not a cryptographic digest.
pub const READ_AGENT: AgentManifest = AgentManifest {
    agent_id: 1,
    goal_digest: *b"elysia:bounded-document-read:v01",
    context: ContextSet(1),
    authority: AuthoritySet(1),
    memory_pages: MAX_AGENT_MEMORY_PAGES,
    cpu_ticks: MAX_AGENT_CPU_TICKS,
    network_bytes: 0,
    tools: ToolSet(1),
    approval: ApprovalPolicy::Always,
    recovery: RecoveryPolicy::ReclaimAll,
};

/// Kernel-owned binding. Its fields cannot be replaced by IPC payloads.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ReadAgent {
    manifest: AgentManifest,
}

impl ReadAgent {
    pub fn new(manifest: AgentManifest) -> Result<Self, DenyReason> {
        manifest.validate(&READ_AGENT)?;
        if manifest.cpu_ticks == 0 {
            return Err(DenyReason::ResourceExceeded);
        }
        Ok(Self { manifest })
    }

    pub fn launch(self) -> Result<crate::launch::Definition, &'static str> {
        let definition = crate::launch::Definition {
            document: if self.manifest.context.0
                & self.manifest.authority.0
                & self.manifest.tools.0
                & 1
                != 0
            {
                Some(0)
            } else {
                None
            },
            memory_pages: self.manifest.memory_pages as usize,
            ticks: self.manifest.cpu_ticks as u64,
            ..crate::launch::INFERENCE_BOOT[0]
        };
        definition.validate(0)?;
        Ok(definition)
    }

    /// The caller and document are resolved by the kernel from IPC provenance
    /// and the live document grant. Raw reads cannot bypass approval.
    pub fn check_request(
        self,
        caller: usize,
        document: usize,
        opcode: u64,
    ) -> Result<(), DenyReason> {
        if caller != 0 {
            return Err(DenyReason::AgentIdentity);
        }
        if document != 0 || self.manifest.context.0 & 1 == 0 {
            return Err(DenyReason::ContextExceeded);
        }
        if self.manifest.authority.0 & 1 == 0 {
            return Err(DenyReason::AuthorityExceeded);
        }
        if self.manifest.tools.0 & 1 == 0 || !matches!(opcode, 10..=12) {
            return Err(DenyReason::ToolsExceeded);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn proposal_respects_reduced_manifest_and_unsupported_io() {
        let ceiling = manifest();
        let mut reduced = ceiling;
        reduced.context = ContextSet(1);
        reduced.tools = ToolSet(1);
        reduced.memory_pages = 2;
        let mut p = proposal(reduced);
        p.requested_context = ceiling.context;
        assert_eq!(
            p.decide(&reduced, &ceiling),
            PolicyDecision::Deny(DenyReason::ContextExceeded)
        );
        p = proposal(reduced);
        p.requested_tools = ceiling.tools;
        assert_eq!(
            p.decide(&reduced, &ceiling),
            PolicyDecision::Deny(DenyReason::ToolsExceeded)
        );
        p = proposal(reduced);
        p.requested_budget.memory_pages = 3;
        assert_eq!(
            p.decide(&reduced, &ceiling),
            PolicyDecision::Deny(DenyReason::ResourceExceeded)
        );
        p = proposal(reduced);
        p.requested_budget.storage_bytes = 1;
        assert_eq!(
            p.decide(&reduced, &ceiling),
            PolicyDecision::Deny(DenyReason::UnsupportedResource)
        );
        p = proposal(reduced);
        p.requested_budget.network_bytes = 1;
        assert_eq!(
            p.decide(&reduced, &ceiling),
            PolicyDecision::Deny(DenyReason::UnsupportedResource)
        );
        reduced.approval = ApprovalPolicy::Never;
        assert_eq!(
            proposal(reduced).decide(&reduced, &ceiling),
            PolicyDecision::Deny(DenyReason::PolicyChanged)
        );
    }

    #[test]
    fn read_agent_reduces_real_launch_limits_and_requires_approval() {
        let reduced = AgentManifest {
            memory_pages: 2,
            cpu_ticks: 30,
            ..READ_AGENT
        };
        let agent = ReadAgent::new(reduced).unwrap();
        let launch = agent.launch().unwrap();
        assert_eq!(launch.memory_pages, 2);
        assert_eq!(launch.ticks, 30);
        assert_eq!(launch.document, Some(0));
        let mut p = proposal(reduced);
        p.mutates_state = false;
        assert_eq!(
            p.decide(&reduced, &READ_AGENT),
            PolicyDecision::NeedsApproval
        );
        assert!(
            ReadAgent::new(AgentManifest {
                cpu_ticks: 0,
                ..READ_AGENT
            })
            .is_err()
        );
        for (caller, document, opcode) in [
            (1, 0, 10),
            (0, 1, 10),
            (0, 64, 10),
            (0, 0, 1),
            (0, 0, 2),
            (0, 0, 99),
        ] {
            assert!(agent.check_request(caller, document, opcode).is_err());
        }
        for opcode in 10..=12 {
            assert!(agent.check_request(0, 0, opcode).is_ok());
        }
        for reduced in [
            AgentManifest {
                context: ContextSet::NONE,
                ..READ_AGENT
            },
            AgentManifest {
                authority: AuthoritySet::NONE,
                ..READ_AGENT
            },
            AgentManifest {
                tools: ToolSet::NONE,
                ..READ_AGENT
            },
        ] {
            let agent = ReadAgent::new(reduced).unwrap();
            assert_eq!(agent.launch().unwrap().document, None);
            assert!(agent.check_request(0, 0, 10).is_err());
        }
    }
    fn manifest() -> AgentManifest {
        AgentManifest {
            agent_id: 7,
            goal_digest: [3; 32],
            context: ContextSet(0b0011),
            authority: AuthoritySet(1),
            memory_pages: 4,
            cpu_ticks: 200,
            network_bytes: 0,
            tools: ToolSet(0b0011),
            approval: ApprovalPolicy::RequiredForMutation,
            recovery: RecoveryPolicy::RestartWithManifest,
        }
    }
    fn proposal(manifest: AgentManifest) -> AgentProposal {
        AgentProposal {
            agent_id: manifest.agent_id,
            goal_digest: manifest.goal_digest,
            requested_context: manifest.context,
            requested_authority: manifest.authority,
            requested_tools: manifest.tools,
            requested_budget: ResourceBudget {
                memory_pages: manifest.memory_pages,
                cpu_ticks: manifest.cpu_ticks,
                network_bytes: 0,
                storage_bytes: 0,
            },
            mutates_state: true,
        }
    }
    #[test]
    fn manifest_cannot_enlarge_authority_or_budget() {
        let ceiling = manifest();
        assert!(ceiling.validate(&ceiling).is_ok());
        let mut larger = ceiling;
        larger.authority = AuthoritySet(0b0101);
        assert_eq!(
            larger.validate(&ceiling),
            Err(DenyReason::AuthorityExceeded)
        );
        larger = ceiling;
        larger.memory_pages += 1;
        assert_eq!(larger.validate(&ceiling), Err(DenyReason::ResourceExceeded));
        larger = ceiling;
        larger.tools = ToolSet(0b0100);
        assert_eq!(larger.validate(&ceiling), Err(DenyReason::ToolsExceeded));
    }
    #[test]
    fn proposal_is_not_permission_and_mutation_needs_approval() {
        let manifest = manifest();
        let mut p = proposal(manifest);
        assert_eq!(
            p.decide(&manifest, &manifest),
            PolicyDecision::NeedsApproval
        );
        p.mutates_state = false;
        assert_eq!(p.decide(&manifest, &manifest), PolicyDecision::Allow);
        p.requested_authority = AuthoritySet(2);
        assert_eq!(
            p.decide(&manifest, &manifest),
            PolicyDecision::Deny(DenyReason::AuthorityExceeded)
        );
    }
    #[test]
    fn goal_and_identity_changes_are_denied() {
        let manifest = manifest();
        let mut p = proposal(manifest);
        p.goal_digest = [4; 32];
        assert_eq!(
            p.decide(&manifest, &manifest),
            PolicyDecision::Deny(DenyReason::GoalChanged)
        );
        p.goal_digest = manifest.goal_digest;
        p.agent_id = 8;
        assert_eq!(
            p.decide(&manifest, &manifest),
            PolicyDecision::Deny(DenyReason::AgentIdentity)
        );
    }
    #[test]
    fn unsupported_future_resources_fail_closed() {
        assert!(resource_supported(ResourceKind::Cpu));
        assert!(resource_supported(ResourceKind::Memory));
        for kind in [
            ResourceKind::Gpu,
            ResourceKind::Npu,
            ResourceKind::Fpga,
            ResourceKind::CxlMemory,
            ResourceKind::Qpu,
        ] {
            assert!(!resource_supported(kind));
        }
    }
}
