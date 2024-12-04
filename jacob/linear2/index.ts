import { nodes, state } from "membrane";
  
  async function makeLinearRequest(input: string): Promise<any> {
  const apiKey = state.api_key;
  if (!apiKey) {
    throw new Error('api_key is not set');
  }
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({query:input.replace(/\n/g, "")}),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
    
export const Root = {
  attachment: () => ({}),
  customview: () => ({}),
  customer: () => ({}),
  customerneed: () => ({}),
  customerstatus: () => ({}),
  customertier: () => ({}),
  cycle: () => ({}),
  document: () => ({}),
  emoji: () => ({}),
  entityexternallink: () => ({}),
  externaluser: () => ({}),
  favorite: () => ({}),
  initiative: () => ({}),
  initiativetoproject: () => ({}),
  integration: () => ({}),
  integrationtemplate: () => ({}),
  integrationssettings: () => ({}),
  issue: () => ({}),
  issuelabel: () => ({}),
  issuerelation: () => ({}),
  organizationinvite: () => ({}),
  project: () => ({}),
  projectlink: () => ({}),
  projectmilestone: () => ({}),
  projectrelation: () => ({}),
  projectstatus: () => ({}),
  projectupdate: () => ({}),
  projectupdateinteraction: () => ({}),
  roadmap: () => ({}),
  roadmaptoproject: () => ({}),
  team: () => ({}),
  teammembership: () => ({}),
  template: () => ({}),
  timeschedule: () => ({}),
  triageresponsibility: () => ({}),
  user: () => ({}),
  webhook: () => ({}),
  workflowstate: () => ({}),
  configure: async (args) => {
    if (args.api_key !== state.api_key) {
      console.log("Saving API key");
      state.api_key = args.api_key;
    }
  },
};

  export const AttachmentCollection = {

    async one(args, { info }) {
      const query =`
      {
        attachment(id: args.id) {
          groupBySource
          sourceType
          subtitle
          title
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const CustomViewCollection = {

    async one(args, { info }) {
      const query =`
      {
        customView(id: args.id) {
          color
          description
          icon
          modelName
          name
          shared
          slugId
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const CustomerCollection = {

    async one(args, { info }) {
      const query =`
      {
        customer(id: args.id) {
          domains
          externalIds
          logoUrl
          name
          revenue
          size
          slackChannelId
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const CustomerNeedCollection = {

    async one(args, { info }) {
      const query =`
      {
        customerNeed(id: args.id) {
          body
          bodyData
          priority
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const CustomerStatusCollection = {

    async one(args, { info }) {
      const query =`
      {
        customerStatus(id: args.id) {
          color
          description
          name
          position
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const CustomerTierCollection = {

    async one(args, { info }) {
      const query =`
      {
        customerTier(id: args.id) {
          color
          description
          name
          position
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const CycleCollection = {

    async one(args, { info }) {
      const query =`
      {
        cycle(id: args.id) {
          completedIssueCountHistory
          completedScopeHistory
          description
          inProgressScopeHistory
          issueCountHistory
          name
          number
          progress
          scopeHistory
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const DocumentCollection = {

    async one(args, { info }) {
      const query =`
      {
        document(id: args.id) {
          color
          content
          contentState
          documentContentId
          icon
          slugId
          sortOrder
          title
          trashed
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const EmojiCollection = {

    async one(args, { info }) {
      const query =`
      {
        emoji(id: args.id) {
          name
          source
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const EntityExternalLinkCollection = {

    async one(args, { info }) {
      const query =`
      {
        entityExternalLink(id: args.id) {
          label
          sortOrder
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ExternalUserCollection = {

    async one(args, { info }) {
      const query =`
      {
        externalUser(id: args.id) {
          avatarUrl
          displayName
          email
          name
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const FavoriteCollection = {

    async one(args, { info }) {
      const query =`
      {
        favorite(id: args.id) {
          color
          detail
          folderName
          icon
          predefinedViewType
          sortOrder
          title
          type
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const InitiativeCollection = {

    async one(args, { info }) {
      const query =`
      {
        initiative(id: args.id) {
          color
          description
          icon
          name
          slugId
          sortOrder
          trashed
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const InitiativeToProjectCollection = {

    async one(args, { info }) {
      const query =`
      {
        initiativeToProject(id: args.id) {
          sortOrder
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const IntegrationCollection = {

    async one(args, { info }) {
      const query =`
      {
        integration(id: args.id) {
          service
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const IntegrationTemplateCollection = {

    async one(args, { info }) {
      const query =`
      {
        integrationTemplate(id: args.id) {
          foreignEntityId
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const IntegrationsSettingsCollection = {

    async one(args, { info }) {
      const query =`
      {
        integrationsSettings(id: args.id) {
          slackIssueAddedToTriage
          slackIssueAddedToView
          slackIssueCreated
          slackIssueNewComment
          slackIssueSlaBreached
          slackIssueSlaHighRisk
          slackIssueStatusChangedAll
          slackIssueStatusChangedDone
          slackProjectUpdateCreated
          slackProjectUpdateCreatedToTeam
          slackProjectUpdateCreatedToWorkspace
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const IssueCollection = {

    async one(args, { info }) {
      const query =`
      {
        issue(id: args.id) {
          boardOrder
          branchName
          customerTicketCount
          description
          descriptionState
          estimate
          identifier
          labelIds
          number
          previousIdentifiers
          priority
          priorityLabel
          prioritySortOrder
          sortOrder
          subIssueSortOrder
          title
          trashed
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const IssueLabelCollection = {

    async one(args, { info }) {
      const query =`
      {
        issueLabel(id: args.id) {
          color
          description
          isGroup
          name
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const IssueRelationCollection = {

    async one(args, { info }) {
      const query =`
      {
        issueRelation(id: args.id) {
          type
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const OrganizationInviteCollection = {

    async one(args, { info }) {
      const query =`
      {
        organizationInvite(id: args.id) {
          email
          external
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ProjectCollection = {

    async one(args, { info }) {
      const query =`
      {
        project(id: args.id) {
          color
          completedIssueCountHistory
          completedScopeHistory
          content
          contentState
          description
          icon
          inProgressScopeHistory
          issueCountHistory
          name
          priority
          prioritySortOrder
          progress
          scope
          scopeHistory
          slackIssueComments
          slackIssueStatuses
          slackNewIssue
          slugId
          sortOrder
          state
          trashed
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ProjectLinkCollection = {

    async one(args, { info }) {
      const query =`
      {
        projectLink(id: args.id) {
          label
          sortOrder
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ProjectMilestoneCollection = {

    async one(args, { info }) {
      const query =`
      {
        projectMilestone(id: args.id) {
          description
          descriptionState
          name
          sortOrder
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ProjectRelationCollection = {

    async one(args, { info }) {
      const query =`
      {
        projectRelation(id: args.id) {
          anchorType
          relatedAnchorType
          type
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ProjectStatusCollection = {

    async one(args, { info }) {
      const query =`
      {
        projectStatus(id: args.id) {
          color
          description
          indefinite
          name
          position
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ProjectUpdateCollection = {

    async one(args, { info }) {
      const query =`
      {
        projectUpdate(id: args.id) {
          body
          bodyData
          diffMarkdown
          isDiffHidden
          slugId
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const ProjectUpdateInteractionCollection = {

    async one(args, { info }) {
      const query =`
      {
        projectUpdateInteraction(id: args.id) {
          
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const RoadmapCollection = {

    async one(args, { info }) {
      const query =`
      {
        roadmap(id: args.id) {
          color
          description
          name
          slugId
          sortOrder
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const RoadmapToProjectCollection = {

    async one(args, { info }) {
      const query =`
      {
        roadmapToProject(id: args.id) {
          sortOrder
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const TeamCollection = {

    async one(args, { info }) {
      const query =`
      {
        team(id: \"${args.id}\") {
          autoArchivePeriod
          autoCloseChildIssues
          autoCloseParentIssues
          autoClosePeriod
          autoCloseStateId
          color
          cycleCalenderUrl
          cycleCooldownTime
          cycleDuration
          cycleIssueAutoAssignCompleted
          cycleIssueAutoAssignStarted
          cycleLockToActive
          cycleStartDay
          cyclesEnabled
          defaultIssueEstimate
          defaultTemplateForMembersId
          defaultTemplateForNonMembersId
          description
          groupIssueHistory
          icon
          inviteHash
          issueCount
          issueEstimationAllowZero
          issueEstimationExtended
          issueEstimationType
          issueOrderingNoPriorityFirst
          issueSortOrderDefaultToBottom
          joinByDefault
          key
          name
          private
          requirePriorityToLeaveTriage
          scimGroupName
          scimManaged
          setIssueSortOrderOnStateChange
          slackIssueComments
          slackIssueStatuses
          slackNewIssue
          timezone
          triageEnabled
          upcomingCycleCount
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const TeamMembershipCollection = {

    async one(args, { info }) {
      const query =`
      {
        teamMembership(id: args.id) {
          owner
          sortOrder
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const TemplateCollection = {

    async one(args, { info }) {
      const query =`
      {
        template(id: args.id) {
          description
          name
          sortOrder
          type
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const TimeScheduleCollection = {

    async one(args, { info }) {
      const query =`
      {
        timeSchedule(id: args.id) {
          externalId
          externalUrl
          name
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const TriageResponsibilityCollection = {

    async one(args, { info }) {
      const query =`
      {
        triageResponsibility(id: args.id) {
          
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const UserCollection = {

    async one(args, { info }) {
      const query =`
      {
        user(id: args.id) {
          active
          admin
          avatarBackgroundColor
          avatarUrl
          calendarHash
          createdIssueCount
          description
          disableReason
          displayName
          email
          guest
          initials
          inviteHash
          isMe
          name
          statusEmoji
          statusLabel
          timezone
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const WebhookCollection = {

    async one(args, { info }) {
      const query =`
      {
        webhook(id: args.id) {
          allPublicTeams
          enabled
          label
          resourceTypes
          secret
          url
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  

  export const WorkflowStateCollection = {

    async one(args, { info }) {
      const query =`
      {
        workflowState(id: args.id) {
          color
          description
          name
          position
          type
        }
      }`
      const result = await makeLinearRequest(query);
      const data = result.data;
      if (data) {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          return data[firstKey];
        }
      }
    }
  };
  