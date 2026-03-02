from rest_framework.renderers import JSONRenderer


class CustomJsonRender(JSONRenderer):
    def render(
        self,
        response_body,
        accepted_media_type=None,
        renderer_context=None,
    ):
        response_instance = renderer_context["response"]

        response = {
            "data": {},
            "meta": {
                "success": "",
                "status_code": response_instance.status_code,
                "message": "",
                "type": "",
            },
        }

        if response_instance.status_code == 204:
            return super().render(None, accepted_media_type, renderer_context)

        if isinstance(response_body, dict) and len(response_body) > 0:
            response["data"] = response_body.pop("data", response["data"])
            response["meta"] = response_body.pop("meta", response["meta"])

            if status_code := response_body.pop("status_code", None):
                response["meta"]["status_code"] = status_code
                response_instance.status_code = status_code

            response["meta"]["success"] = response_body.pop(
                "success",
                not response_instance.exception
                and response["meta"]["status_code"] < 400,
            )

            response["meta"]["message"] = response_body.pop(
                "message", response["meta"]["message"]
            )
            response["meta"]["type"] = response_body.pop(
                "type", response["meta"]["type"]
            )

            if isinstance(response["data"], dict):
                response["data"] = {**response["data"], **response_body}
        elif response_body is not None:
            response["data"] = response_body

        return super().render(response, accepted_media_type, renderer_context)
