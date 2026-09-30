import { describe, it, expect, beforeEach } from "vitest";
import { api, registerUser, truncateAll } from "../helpers.js";

beforeEach(truncateAll);

describe("dietary rules integration", () => {
  it("returns empty rules for a new user", async () => {
    const { agent } = await registerUser();
    const response = await agent.get("/api/v1/dietary-rules");
    expect(response.status).toBe(200);
    expect(response.body.data.rules).toEqual([]);
  });

  it("replaces rules and returns the new set", async () => {
    const { agent } = await registerUser();
    const response = await agent
      .put("/api/v1/dietary-rules")
      .send({
        rules: [
          { ruleType: "diet", ruleValue: "vegetarian" },
          { ruleType: "allergy", ruleValue: "peanut" }
        ]
      });
    expect(response.status).toBe(200);
    expect(response.body.data.rules).toHaveLength(2);
  });

  it("removes old rules on replace", async () => {
    const { agent } = await registerUser();
    await agent.put("/api/v1/dietary-rules").send({
      rules: [
        { ruleType: "diet", ruleValue: "vegetarian" },
        { ruleType: "allergy", ruleValue: "peanut" }
      ]
    });
    await agent.put("/api/v1/dietary-rules").send({
      rules: [{ ruleType: "diet", ruleValue: "vegan" }]
    });
    const response = await agent.get("/api/v1/dietary-rules");
    expect(response.body.data.rules).toHaveLength(1);
    expect(response.body.data.rules[0].ruleValue).toBe("vegan");
  });

  it("clears rules with an empty list", async () => {
    const { agent } = await registerUser();
    await agent
      .put("/api/v1/dietary-rules")
      .send({ rules: [{ ruleType: "diet", ruleValue: "vegan" }] });
    const response = await agent
      .put("/api/v1/dietary-rules")
      .send({ rules: [] });
    expect(response.status).toBe(200);
    expect(response.body.data.rules).toEqual([]);
  });

  it("rejects unknown rule type with 400", async () => {
    const { agent } = await registerUser();
    const response = await agent
      .put("/api/v1/dietary-rules")
      .send({ rules: [{ ruleType: "nonsense", ruleValue: "x" }] });
    expect(response.status).toBe(400);
  });

  it("rejects case-insensitive duplicates with 400", async () => {
    const { agent } = await registerUser();
    const response = await agent
      .put("/api/v1/dietary-rules")
      .send({
        rules: [
          { ruleType: "diet", ruleValue: "vegetarian" },
          { ruleType: "diet", ruleValue: "Vegetarian" }
        ]
      });
    expect(response.status).toBe(400);
  });

  it("isolates rules between users", async () => {
    const { agent: a } = await registerUser();
    const { agent: b } = await registerUser();
    await a
      .put("/api/v1/dietary-rules")
      .send({ rules: [{ ruleType: "diet", ruleValue: "vegan" }] });

    const response = await b.get("/api/v1/dietary-rules");
    expect(response.body.data.rules).toEqual([]);
  });

  it("rejects unauthenticated requests with 401", async () => {
    const response = await api().get("/api/v1/dietary-rules");
    expect(response.status).toBe(401);
  });
});

