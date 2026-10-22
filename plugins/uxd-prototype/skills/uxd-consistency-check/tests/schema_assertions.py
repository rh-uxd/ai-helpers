"""Small stdlib assertion walker for the vocabulary used in our JSON schemas.

Not a general JSON Schema implementation. Unknown keywords fail the tests so
schema additions cannot silently escape this offline contract check.
"""
import re


def assert_schema(test, value, schema, root=None):
    root = schema if root is None else root
    supported = {"$schema", "$id", "$ref", "$defs", "title", "description", "type", "required",
                 "properties", "additionalProperties", "items", "const", "enum", "pattern",
                 "minLength", "minimum", "uniqueItems", "allOf", "if", "then", "else", "format"}
    test.assertFalse(set(schema) - supported, f"Unsupported schema vocabulary: {set(schema) - supported}")
    if "$ref" in schema:
        target = root
        test.assertTrue(schema["$ref"].startswith("#/"))
        for part in schema["$ref"][2:].split("/"):
            target = target[part]
        assert_schema(test, value, target, root)
    if "const" in schema:
        test.assertEqual(value, schema["const"])
    if "enum" in schema:
        test.assertIn(value, schema["enum"])
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        checks = {"object": lambda: isinstance(value, dict), "array": lambda: isinstance(value, list),
                  "string": lambda: isinstance(value, str), "integer": lambda: type(value) is int,
                  "boolean": lambda: type(value) is bool, "null": lambda: value is None}
        test.assertTrue(any(checks[t]() for t in types), f"{value!r} not {types}")
    if isinstance(value, dict):
        test.assertTrue(set(schema.get("required", [])) <= set(value), "Missing required properties")
        for key, child in schema.get("properties", {}).items():
            if key in value:
                assert_schema(test, value[key], child, root)
        if schema.get("additionalProperties") is False:
            test.assertTrue(set(value) <= set(schema.get("properties", {})))
    if isinstance(value, list):
        for item in value:
            if "items" in schema:
                assert_schema(test, item, schema["items"], root)
        if schema.get("uniqueItems"):
            test.assertFalse(any(item in value[:i] for i, item in enumerate(value)))
    if isinstance(value, str):
        if "pattern" in schema:
            test.assertIsNotNone(re.search(schema["pattern"], value))
        test.assertGreaterEqual(len(value), schema.get("minLength", 0))
    if type(value) is int and "minimum" in schema:
        test.assertGreaterEqual(value, schema["minimum"])
    for child in schema.get("allOf", []):
        assert_schema(test, value, child, root)
    if "if" in schema:
        try:
            assert_schema(test, value, schema["if"], root)
        except AssertionError:
            child = schema.get("else", {})
        else:
            child = schema.get("then", {})
        assert_schema(test, value, child, root)
