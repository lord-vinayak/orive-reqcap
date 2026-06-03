import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync


class TaskUpdateConsumer(WebsocketConsumer):
    GROUP = 'task_updates'

    def connect(self):
        async_to_sync(self.channel_layer.group_add)(self.GROUP, self.channel_name)
        self.accept()

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(self.GROUP, self.channel_name)

    def receive(self, text_data=None, bytes_data=None):
        pass  # server-push only

    def task_update(self, event):
        self.send(text_data=json.dumps(event['data']))


def broadcast_task_update(payload: dict):
    from channels.layers import get_channel_layer
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        TaskUpdateConsumer.GROUP,
        {'type': 'task.update', 'data': payload},
    )
