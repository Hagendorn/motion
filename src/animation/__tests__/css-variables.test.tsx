import "../../../jest.setup"
import { render } from "react-testing-library"
import { motion } from "../../motion"
import { variableParameters } from "../../dom/css-variables-conversion"
import * as React from "react"

const fromName = "--from"
const toName = "--to"
const fromValue = "#09F"
const toValue = "#F00"
const fromVariable = `var(${fromName})`
const toVariable = `var(${toName})`

const style = {
    [fromName]: fromValue,
    [toName]: toValue,
} as React.CSSProperties

// Stub getPropertyValue because CSS variables aren't supported by JSDom

const originalGetComputedStyle = window.getComputedStyle

function getComputedStyleStub() {
    return {
        getPropertyValue(variableName: "--from" | "--to") {
            switch (variableName) {
                case fromName:
                    return fromValue
                case toName:
                    return toValue
                default:
                    throw Error("Should never happen")
            }
        },
    }
}

function stubGetComputedStyles() {
    ;(window as any).getComputedStyle = getComputedStyleStub
}

function resetComputedStyles() {
    window.getComputedStyle = originalGetComputedStyle
}

describe("css variables", () => {
    beforeAll(stubGetComputedStyles)
    afterAll(resetComputedStyles)

    test("should animate css color variables", async () => {
        const promise = new Promise(resolve => {
            let isFirstFrame = true
            const Component = () => (
                <motion.div
                    style={style}
                    initial={{ background: fromVariable }}
                    animate={{ background: toVariable }}
                    onUpdate={({ background }) => {
                        if (isFirstFrame) {
                            isFirstFrame = false
                        } else {
                            resolve(background)
                        }
                    }}
                />
            )

            const { rerender } = render(<Component />)
            rerender(<Component />)
        })
        const resolvedAs = await promise

        // We're running this on the second frame to ensure and checking that
        // the resolved color *isn't* the start or target value. We want it to be an interpolation
        // of the two to ensure it's actually animating and not just switching between them.
        expect(resolvedAs).not.toBe(fromValue)
        expect(resolvedAs).not.toBe(toValue)
        expect(resolvedAs).not.toBe(fromVariable)
        expect(resolvedAs).not.toBe(toVariable)
    })

    // Skipping because this test always succeeds, no matter what style values you check for ¯\\_(ツ)_/¯
    test.skip("should have the original target css variable on animation end", async () => {
        const promise = new Promise<ChildNode | null>(resolve => {
            const resolvePromise = () => {
                requestAnimationFrame(() => resolve(container.firstChild))
            }

            const Component = () => {
                return (
                    <motion.div
                        style={style}
                        initial={{ background: fromVariable }}
                        animate={{ background: toVariable }}
                        // transition={{ duration: 0.01 }}
                        onAnimationComplete={resolvePromise}
                    />
                )
            }

            const { container, rerender } = render(<Component />)

            rerender(<Component />)
        })

        resetComputedStyles()
        const result = expect(promise).resolves.toHaveStyle(
            `background: ${toVariable}`
        )
        stubGetComputedStyles()
        return result
    })

    test("css variable parsing", () => {
        const { mainParameter, fallbackParameter } = variableParameters(
            "var(--ID-123)"
        )
        expect(mainParameter).toBe("--ID-123")
        expect(fallbackParameter).toBeUndefined()
    })

    test("css variable parsing fallback", () => {
        const { mainParameter, fallbackParameter } = variableParameters(
            "var(--ID-123, red)"
        )
        expect(mainParameter).toBe("--ID-123")
        expect(fallbackParameter).toBe("red")
    })

    test("css variable parsing nested fallback", () => {
        const { mainParameter, fallbackParameter } = variableParameters(
            "var(--ID-123, var(--ID-234, cyan))"
        )
        expect(mainParameter).toBe("--ID-123")
        expect(fallbackParameter).toBe("var(--ID-234, cyan)")
    })
})
