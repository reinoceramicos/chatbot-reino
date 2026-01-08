"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const info_flow_1 = require("../info.flow");
describe("Info Flow", () => {
    describe("flow definition", () => {
        it("should have correct name", () => {
            expect(info_flow_1.infoFlow.name).toBe("info");
        });
        it("should have a description", () => {
            expect(info_flow_1.infoFlow.description).toBeDefined();
            expect(info_flow_1.infoFlow.description.length).toBeGreaterThan(0);
        });
        it("should have timeout configured", () => {
            expect(info_flow_1.infoFlow.timeoutMinutes).toBeGreaterThan(0);
        });
        it("should have steps defined", () => {
            expect(info_flow_1.infoFlow.steps).toBeDefined();
            expect(info_flow_1.infoFlow.steps.size).toBeGreaterThan(0);
        });
        it("should have initial step defined", () => {
            expect(info_flow_1.infoFlow.initialStep).toBeDefined();
            expect(info_flow_1.infoFlow.hasStep(info_flow_1.infoFlow.initialStep)).toBe(true);
        });
    });
    describe("steps", () => {
        it("should start with select_topic step", () => {
            expect(info_flow_1.infoFlow.initialStep).toBe("select_topic");
        });
        it("should have all required steps", () => {
            expect(info_flow_1.infoFlow.hasStep("select_topic")).toBe(true);
            expect(info_flow_1.infoFlow.hasStep("show_horarios")).toBe(true);
            expect(info_flow_1.infoFlow.hasStep("show_ubicacion")).toBe(true);
            expect(info_flow_1.infoFlow.hasStep("show_contacto")).toBe(true);
            expect(info_flow_1.infoFlow.hasStep("show_envios")).toBe(true);
            expect(info_flow_1.infoFlow.hasStep("show_pagos")).toBe(true);
            expect(info_flow_1.infoFlow.hasStep("show_garantia")).toBe(true);
            expect(info_flow_1.infoFlow.hasStep("ask_more")).toBe(true);
        });
        describe("select_topic step", () => {
            let step;
            beforeAll(() => {
                step = info_flow_1.infoFlow.getStep("select_topic");
            });
            it("should be a list type", () => {
                expect(step.prompt.type).toBe("list");
            });
            it("should have a prompt with sections", () => {
                expect(step.prompt.body).toBeDefined();
                expect(step.prompt.sections).toBeDefined();
                expect(step.prompt.sections.length).toBeGreaterThan(0);
            });
            it("should have info topics in sections", () => {
                const section = step.prompt.sections[0];
                expect(section.rows).toBeDefined();
                expect(section.rows.length).toBeGreaterThan(0);
            });
            it("should have dynamic nextStep function", () => {
                expect(typeof step.nextStep).toBe("function");
            });
            it("should navigate to correct show step based on selection", () => {
                const nextStepFn = step.nextStep;
                expect(nextStepFn("info_horarios")).toBe("show_horarios");
                expect(nextStepFn("info_ubicacion")).toBe("show_ubicacion");
                expect(nextStepFn("info_contacto")).toBe("show_contacto");
                expect(nextStepFn("info_envios")).toBe("show_envios");
                expect(nextStepFn("info_pagos")).toBe("show_pagos");
                expect(nextStepFn("info_garantia")).toBe("show_garantia");
            });
            describe("available topics", () => {
                const getAllTopicIds = () => {
                    const ids = [];
                    step.prompt.sections.forEach((section) => {
                        section.rows.forEach((row) => {
                            ids.push(row.id);
                        });
                    });
                    return ids;
                };
                it("should have horarios topic", () => {
                    expect(getAllTopicIds()).toContain("info_horarios");
                });
                it("should have ubicacion topic", () => {
                    expect(getAllTopicIds()).toContain("info_ubicacion");
                });
                it("should have contacto topic", () => {
                    expect(getAllTopicIds()).toContain("info_contacto");
                });
                it("should have envios topic", () => {
                    expect(getAllTopicIds()).toContain("info_envios");
                });
                it("should have pagos topic", () => {
                    expect(getAllTopicIds()).toContain("info_pagos");
                });
                it("should have garantia topic", () => {
                    expect(getAllTopicIds()).toContain("info_garantia");
                });
            });
        });
        describe("show_horarios step", () => {
            let step;
            beforeAll(() => {
                step = info_flow_1.infoFlow.getStep("show_horarios");
            });
            it("should be a text type", () => {
                expect(step.prompt.type).toBe("text");
            });
            it("should contain schedule information", () => {
                expect(step.prompt.body.toLowerCase()).toMatch(/horario|lunes|viernes|sabado/);
            });
            it("should navigate to ask_more", () => {
                expect(step.nextStep).toBe("ask_more");
            });
        });
        describe("show_ubicacion step", () => {
            let step;
            beforeAll(() => {
                step = info_flow_1.infoFlow.getStep("show_ubicacion");
            });
            it("should be a text type", () => {
                expect(step.prompt.type).toBe("text");
            });
            it("should contain location information", () => {
                expect(step.prompt.body.toLowerCase()).toMatch(/direcci[oó]n|ubicaci[oó]n/);
            });
            it("should navigate to ask_more", () => {
                expect(step.nextStep).toBe("ask_more");
            });
        });
        describe("show_envios step", () => {
            let step;
            beforeAll(() => {
                step = info_flow_1.infoFlow.getStep("show_envios");
            });
            it("should be a text type", () => {
                expect(step.prompt.type).toBe("text");
            });
            it("should contain shipping information", () => {
                expect(step.prompt.body.toLowerCase()).toMatch(/env[ií]o|entrega/);
            });
            it("should navigate to ask_more", () => {
                expect(step.nextStep).toBe("ask_more");
            });
        });
        describe("show_pagos step", () => {
            let step;
            beforeAll(() => {
                step = info_flow_1.infoFlow.getStep("show_pagos");
            });
            it("should be a text type", () => {
                expect(step.prompt.type).toBe("text");
            });
            it("should contain payment information", () => {
                expect(step.prompt.body.toLowerCase()).toMatch(/pago|efectivo|tarjeta|transferencia/);
            });
            it("should navigate to ask_more", () => {
                expect(step.nextStep).toBe("ask_more");
            });
        });
        describe("ask_more step", () => {
            let step;
            beforeAll(() => {
                step = info_flow_1.infoFlow.getStep("ask_more");
            });
            it("should be a button type", () => {
                expect(step.prompt.type).toBe("button");
            });
            it("should have yes/no buttons", () => {
                expect(step.prompt.buttons).toBeDefined();
                expect(step.prompt.buttons.length).toBeGreaterThanOrEqual(2);
            });
            it("should have a 'yes' option", () => {
                const hasYes = step.prompt.buttons.some((b) => b.id.includes("yes") || b.title.toLowerCase().includes("sí"));
                expect(hasYes).toBe(true);
            });
            it("should have a 'no' option", () => {
                const hasNo = step.prompt.buttons.some((b) => b.id.includes("no") || b.title.toLowerCase().includes("no"));
                expect(hasNo).toBe(true);
            });
            it("should have dynamic nextStep function", () => {
                expect(typeof step.nextStep).toBe("function");
            });
            it("should loop back to select_topic when user wants more", () => {
                const nextStepFn = step.nextStep;
                expect(nextStepFn("more_yes")).toBe("select_topic");
            });
            it("should end flow when user is done", () => {
                const nextStepFn = step.nextStep;
                expect(nextStepFn("more_no")).toBe("END");
            });
        });
    });
    describe("getInitialStep", () => {
        it("should return the initial step", () => {
            const initialStep = info_flow_1.infoFlow.getInitialStep();
            expect(initialStep).toBeDefined();
            expect(initialStep.id).toBe("select_topic");
        });
    });
    describe("createMessageForStep", () => {
        const testWaId = "5491155556666";
        it("should create list message for select_topic", () => {
            const step = info_flow_1.infoFlow.getStep("select_topic");
            const message = info_flow_1.infoFlow.createMessageForStep(step, testWaId);
            expect(message.type).toBe("interactive");
            expect(message.to).toBe(testWaId);
            expect(message.content.interactive?.type).toBe("list");
        });
        it("should create text message for show_horarios", () => {
            const step = info_flow_1.infoFlow.getStep("show_horarios");
            const message = info_flow_1.infoFlow.createMessageForStep(step, testWaId);
            expect(message.type).toBe("text");
            expect(message.to).toBe(testWaId);
        });
        it("should create button message for ask_more", () => {
            const step = info_flow_1.infoFlow.getStep("ask_more");
            const message = info_flow_1.infoFlow.createMessageForStep(step, testWaId);
            expect(message.type).toBe("interactive");
            expect(message.content.interactive?.type).toBe("button");
        });
    });
});
