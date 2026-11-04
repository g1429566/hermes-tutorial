// @vitest-environment node
import { loadPyodide } from 'pyodide';
import { it } from 'vitest';
import {
  buildToolCode,
  buildToolsetsCode,
  DEFAULT_TOOL_FORM,
  PARAM_TYPES,
  simulateToolCall,
} from '@/data/tool-builder';

it('executes generated handlers and toolset entries for the same inputs as the simulation', async () => {
  const cases = PARAM_TYPES.map((paramType) => {
    const form = {
      ...DEFAULT_TOOL_FORM,
      paramType,
      paramName: 'from-column',
      description: 'Read "total" from C:\\reports\nthen return the value.',
      requiresEnv: '',
    };
    const call = simulateToolCall(form);
    return {
      code: buildToolCode(form),
      toolsetEntry: buildToolsetsCode(form),
      argsPython: call.argsPython,
      expected: JSON.parse(call.resultJson),
      description: form.description,
    };
  });
  // Use the same CPython package as the browser lab, without requiring a system Python.
  const python = await loadPyodide();
  python.globals.set('cases_json', JSON.stringify(cases));
  python.runPython(`
import json, sys, types
records = []
registry_stub = types.ModuleType("tools.registry")
registry_stub.registry = types.SimpleNamespace(register=lambda **kw: records.append(kw))
sys.modules["tools"] = types.ModuleType("tools")
sys.modules["tools.registry"] = registry_stub
for case in json.loads(cases_json):
    exec(case["code"], {})
    registered = records[-1]
    assert registered["schema"]["description"] == case["description"]
    groups = eval("{" + case["toolsetEntry"] + "}")
    group = groups[registered["toolset"]]
    assert registered["name"] in group["tools"] and group["includes"] == []
    result = registered["handler"](eval(case["argsPython"]))
    assert json.loads(result) == case["expected"]
`);
});
