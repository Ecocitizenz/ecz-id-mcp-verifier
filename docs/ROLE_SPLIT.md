# Role Split

The verifier is one component in a larger system. It MUST NOT cross
into another component's responsibilities.

| Component             | Owns                                              | Verifier may         |
| --------------------- | ------------------------------------------------- | -------------------- |
| Backend / Core        | Writing truth.                                    | Never write.         |
| Resolver              | Projecting public proof.                          | Read only.           |
| TrustOps              | Setup, acquisition, lifecycle.                    | Route users to.      |
| Developer Gateway     | Explaining and routing developers.                | Route users to.      |
| **MCP Verifier**      | Local checks, reporting, routing.                 | This.                |

The verifier does NOT:

- write truth
- activate proof
- mark BOUND
- certify safety
- approve agents
- create an MCP Passport
- create a Reciprocity Passport
- perform checkout
- run autonomous LLM/agent behaviour
- emit telemetry
